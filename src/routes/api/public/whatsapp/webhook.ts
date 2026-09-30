import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookRequest } from "@lovable.dev/webhooks-js";

interface WebhookEnvelope {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          errors?: unknown[];
        }>;
      };
    }>;
  }>;
}

const STATUS_RANK: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

function timestampFromUnix(value?: string) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function messageBody(message: NonNullable<NonNullable<NonNullable<WebhookEnvelope["entry"]>[number]["changes"]>[number]["value"]>["messages"] extends Array<infer T> ? T : never) {
  if (message.type === "text") return message.text?.body?.trim() || "Mensagem sem texto";
  const labels: Record<string, string> = {
    image: "Imagem recebida",
    video: "Vídeo recebido",
    audio: "Áudio recebido",
    document: "Documento recebido",
    sticker: "Figurinha recebida",
    location: "Localização recebida",
    contacts: "Contato recebido",
  };
  return labels[message.type ?? ""] ?? "Mensagem recebida";
}

async function processPayload(payload: WebhookEnvelope, deliveryId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const value = payload.entry?.[0]?.changes?.[0]?.value;
  if (!value) return;

  const contact = value.contacts?.[0];
  for (const incoming of value.messages ?? []) {
    if (!incoming.id || !incoming.from) continue;
    const createdAt = timestampFromUnix(incoming.timestamp);
    const body = messageBody(incoming);
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("whatsapp_conversations")
      .upsert(
        {
          phone: incoming.from,
          contact_name: contact?.profile?.name ?? null,
          last_message: body,
          last_message_at: createdAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" },
      )
      .select("id, unread_count")
      .single();
    if (conversationError || !conversation) throw conversationError ?? new Error("Conversation upsert failed");

    const { data: existing } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id")
      .eq("provider_message_id", incoming.id)
      .maybeSingle();
    if (!existing) {
      const { error: messageError } = await supabaseAdmin.from("whatsapp_messages").insert({
        conversation_id: conversation.id,
        provider_message_id: incoming.id,
        direction: "inbound",
        message_type: incoming.type ?? "unknown",
        body,
        status: "received",
        provider_timestamp: createdAt,
      });
      if (messageError) throw messageError;
      await supabaseAdmin
        .from("whatsapp_conversations")
        .update({ unread_count: conversation.unread_count + 1 })
        .eq("id", conversation.id);
    }
  }

  for (const statusEvent of value.statuses ?? []) {
    if (!statusEvent.id || !statusEvent.status || !(statusEvent.status in STATUS_RANK)) continue;
    const occurredAt = timestampFromUnix(statusEvent.timestamp);
    const errorDetails = statusEvent.errors?.length ? statusEvent.errors : null;
    const { error: statusError } = await supabaseAdmin.from("whatsapp_message_statuses").upsert(
      {
        provider_message_id: statusEvent.id,
        status: statusEvent.status,
        provider_timestamp: occurredAt,
        error_details: errorDetails,
        delivery_id: deliveryId,
      },
      { onConflict: "delivery_id,provider_message_id,status" },
    );
    if (statusError) throw statusError;

    const { data: stored } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id, status, sent_at, delivered_at, read_at, failed_at")
      .eq("provider_message_id", statusEvent.id)
      .maybeSingle();
    if (!stored) continue;
    if (statusEvent.status !== "failed" && (STATUS_RANK[statusEvent.status] ?? 0) < (STATUS_RANK[stored.status] ?? 0)) continue;

    const updates: Record<string, unknown> = { status: statusEvent.status, error_details: errorDetails };
    if (statusEvent.status === "sent" && !stored.sent_at) updates.sent_at = occurredAt;
    if (statusEvent.status === "delivered" && !stored.delivered_at) updates.delivered_at = occurredAt;
    if (statusEvent.status === "read" && !stored.read_at) updates.read_at = occurredAt;
    if (statusEvent.status === "failed" && !stored.failed_at) updates.failed_at = occurredAt;
    const { error: updateError } = await supabaseAdmin.from("whatsapp_messages").update(updates).eq("id", stored.id);
    if (updateError) throw updateError;
  }
}

async function recoverPending(excludeId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pending } = await supabaseAdmin
    .from("whatsapp_webhook_events")
    .select("id, delivery_id, payload, attempts")
    .is("processed_at", null)
    .neq("id", excludeId)
    .lt("attempts", 5)
    .order("received_at", { ascending: true })
    .limit(5);
  for (const event of pending ?? []) {
    try {
      await processPayload(event.payload as unknown as WebhookEnvelope, event.delivery_id);
      await supabaseAdmin.from("whatsapp_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null, attempts: event.attempts + 1 }).eq("id", event.id);
    } catch (error) {
      await supabaseAdmin.from("whatsapp_webhook_events").update({ processing_error: error instanceof Error ? error.message : "Processing failed", attempts: event.attempts + 1 }).eq("id", event.id);
    }
  }
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['WHATSAPP_API_KEY'];
        if (!secret) return new Response("Unavailable", { status: 503 });
        const deliveryId = request.headers.get("x-lovable-delivery")?.trim();
        const event = request.headers.get("x-lovable-event")?.trim();
        if (!deliveryId || !event) return new Response("Missing delivery headers", { status: 400 });

        let payload: WebhookEnvelope;
        try {
          const verified = await verifyWebhookRequest<WebhookEnvelope>({ req: request, secret, maxBodyBytes: 4 * 1024 * 1024 });
          payload = verified.payload;
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: stored, error: storeError } = await supabaseAdmin
          .from("whatsapp_webhook_events")
          .upsert({ delivery_id: deliveryId, event, payload }, { onConflict: "delivery_id", ignoreDuplicates: true })
          .select("id, processed_at, attempts")
          .maybeSingle();
        if (storeError) return new Response("Storage failed", { status: 500 });

        const { data: eventRow } = stored
          ? { data: stored }
          : await supabaseAdmin.from("whatsapp_webhook_events").select("id, processed_at, attempts").eq("delivery_id", deliveryId).single();
        if (!eventRow) return new Response("Storage failed", { status: 500 });
        if (eventRow.processed_at) return new Response("ok");

        try {
          await processPayload(payload, deliveryId);
          const { error: completeError } = await supabaseAdmin
            .from("whatsapp_webhook_events")
            .update({ processed_at: new Date().toISOString(), processing_error: null, attempts: eventRow.attempts + 1 })
            .eq("id", eventRow.id);
          if (completeError) throw completeError;
          await recoverPending(eventRow.id);
          return new Response("ok");
        } catch (error) {
          await supabaseAdmin
            .from("whatsapp_webhook_events")
            .update({ processing_error: error instanceof Error ? error.message : "Processing failed", attempts: eventRow.attempts + 1 })
            .eq("id", eventRow.id);
          return new Response("Processing failed", { status: 500 });
        }
      },
    },
  },
});
