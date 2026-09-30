import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4096),
});

const conversationSchema = z.object({ conversationId: z.string().uuid() });

async function requireAdmin(context: {
  supabase: {
    rpc: (name: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso não autorizado.");
}

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sendSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: conversation, error: conversationError } = await context.supabase
      .from("whatsapp_conversations")
      .select("id, phone")
      .eq("id", data.conversationId)
      .single();
    if (conversationError || !conversation) throw new Error("Conversa não encontrada.");

    const lovableApiKey = process.env['LOVABLE_API_KEY'];
    const whatsappApiKey = process.env['WHATSAPP_API_KEY'];
    if (!lovableApiKey || !whatsappApiKey) throw new Error("A conexão com o WhatsApp não está disponível.");

    const response = await fetch("https://connector-gateway.lovable.dev/whatsapp/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": whatsappApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: conversation.phone,
        type: "text",
        text: { body: data.body },
      }),
    });
    const responseText = await response.text();
    if (!response.ok) {
      console.error(`WhatsApp send failed [${response.status}]: ${responseText}`);
      throw new Error("Não foi possível enviar a mensagem.");
    }

    let providerMessageId: string | null = null;
    try {
      const result = JSON.parse(responseText) as { messages?: Array<{ id?: string }> };
      providerMessageId = result.messages?.[0]?.id ?? null;
    } catch {
      providerMessageId = null;
    }
    if (!providerMessageId) throw new Error("O WhatsApp não confirmou o envio.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data: message, error: insertError } = await supabaseAdmin
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversation.id,
        provider_message_id: providerMessageId,
        direction: "outbound",
        message_type: "text",
        body: data.body,
        status: "accepted",
        sent_at: now,
      })
      .select("*")
      .single();
    if (insertError) throw insertError;

    await supabaseAdmin
      .from("whatsapp_conversations")
      .update({ last_message: data.body, last_message_at: now, updated_at: now })
      .eq("id", conversation.id);

    const { data: latestStatus } = await supabaseAdmin
      .from("whatsapp_message_statuses")
      .select("status, provider_timestamp, error_details")
      .eq("provider_message_id", providerMessageId)
      .order("provider_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestStatus) {
      const timestamp = latestStatus.provider_timestamp ?? now;
      await supabaseAdmin
        .from("whatsapp_messages")
        .update({
          status: latestStatus.status,
          sent_at: latestStatus.status === "sent" ? timestamp : message.sent_at,
          delivered_at: latestStatus.status === "delivered" ? timestamp : message.delivered_at,
          read_at: latestStatus.status === "read" ? timestamp : message.read_at,
          failed_at: latestStatus.status === "failed" ? timestamp : message.failed_at,
          error_details: latestStatus.error_details,
        })
        .eq("id", message.id);
    }
    return { ok: true };
  });

export const markWhatsAppConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => conversationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0, updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    if (error) throw error;
    return { ok: true };
  });
