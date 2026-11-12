import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { brandedHtml } from "@/lib/email-brand";

const ALERT_TO = "petersonmorais4@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const OFFLINE_AFTER_MS = 3 * 60_000;

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

export const Route = createFileRoute("/api/public/jobs/screens-offline-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("screens")
          .select("name, code, location, last_seen")
          .order("name");
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const now = Date.now();
        const offline = (data ?? []).filter(
          (s) => !s.last_seen || now - new Date(s.last_seen).getTime() > OFFLINE_AFTER_MS,
        );
        if (offline.length === 0) return Response.json({ sent: false, offline: 0 });

        const lines = offline.map((s) => {
          const seen = s.last_seen
            ? new Date(s.last_seen).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
            : "nunca";
          return `- ${s.name} (código ${s.code})${s.location ? ` — ${s.location}` : ""} · último sinal: ${seen}`;
        });
        const body = [
          "Bom dia!",
          "",
          `${offline.length} ponto(s) da TelaHUB estão offline às 8h:`,
          "",
          ...lines,
          "",
          "Verifique se as TV boxes estão ligadas e conectadas à internet.",
        ].join("\n");
        const raw = b64(
          [
            `To: ${ALERT_TO}`,
            `Subject: ${header(`TelaHUB: ${offline.length} ponto(s) offline às 8h`)}`,
            "MIME-Version: 1.0",
            'Content-Type: text/html; charset="UTF-8"',
            "",
            brandedHtml(body),
          ].join("\r\n"),
        )
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env['LOVABLE_API_KEY']}`,
            "X-Connection-Api-Key": process.env['GOOGLE_MAIL_API_KEY'] ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error(`Gmail send failed [${res.status}]: ${text}`);
          return Response.json({ error: text }, { status: 502 });
        }
        return Response.json({ sent: true, offline: offline.length });
      },
    },
  },
});
