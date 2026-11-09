import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { brandedHtml, parseEmails } from "@/lib/email-brand";
import { isWithinBusinessHours } from "@/lib/business-hours";

const ADMIN_TO = "petersonmorais4@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const OFFLINE_AFTER_MS = 45_000;

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

async function sendMail(to: string, subject: string, body: string) {
  const raw = b64(
    [`To: ${to}`, `Subject: ${header(subject)}`, "MIME-Version: 1.0", 'Content-Type: text/html; charset="UTF-8"', "", brandedHtml(body)].join("\r\n"),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["GOOGLE_MAIL_API_KEY"] ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Gmail send failed [${res.status}]: ${text}`);
    return `erro ${res.status}`;
  }
  return null;
}

type Row = {
  id: string;
  name: string;
  code: string;
  location: string | null;
  last_seen: string | null;
  business_hours: unknown;
};
type Contact = { screen_id: string; partner_name: string | null; partner_email: string | null };

export const Route = createFileRoute("/api/public/jobs/partner-tv-reminder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as unknown as { from: (t: string) => any };
        const [screensRes, contactsRes] = await Promise.all([
          supabaseAdmin.from("screens").select("id, name, code, location, last_seen, business_hours").order("name"),
          db.from("screen_contacts").select("screen_id, partner_name, partner_email"),
        ]);
        if (screensRes.error) return Response.json({ error: screensRes.error.message }, { status: 500 });
        if (contactsRes.error) return Response.json({ error: contactsRes.error.message }, { status: 500 });

        const contacts = new Map<string, Contact>();
        for (const c of (contactsRes.data ?? []) as Contact[]) contacts.set(c.screen_id, c);

        const now = Date.now();
        const offline = ((screensRes.data ?? []) as Row[]).filter(
          (s) => isWithinBusinessHours(s.business_hours, new Date(now)) && (!s.last_seen || now - new Date(s.last_seen).getTime() > OFFLINE_AFTER_MS),
        );
        if (offline.length === 0) return Response.json({ offline: 0 });

        const report: string[] = [];
        for (const s of offline) {
          const c = contacts.get(s.id);
          const emails = parseEmails(c?.partner_email);
          const email = emails.join(", ");
          const place = s.location ? `${s.name} (${s.location})` : s.name;
          if (emails.length === 0) {
            report.push(`- ${place}: sem e-mail de parceiro cadastrado`);
            continue;
          }
          const greeting = c?.partner_name?.trim() ? `Olá, ${c.partner_name.trim()}!` : "Olá!";
          const err = await sendMail(
            email,
            "TelaHUB: sua TV ainda não foi ligada hoje",
            [
              greeting,
              "",
              `Notamos que a TV da TelaHUB em ${place} ainda não foi ligada hoje.`,
              "",
              "Poderia verificar se a TV e o aparelho (TV box) estão ligados na tomada e conectados à internet?",
              "",
              "Se precisar de ajuda, é só responder este e-mail ou chamar no WhatsApp: https://wa.me/5511964424040",
              "",
              "Obrigado!",
              "Equipe TelaHUB",
            ].join("\n"),
          );
          report.push(`- ${place}: ${err ? `falha ao enviar para ${email} (${err})` : `lembrete enviado para ${email}`}`);
        }

        await sendMail(
          ADMIN_TO,
          `TelaHUB: lembretes das 9h (${offline.length} TV(s) desligada(s))`,
          ["Resumo dos lembretes enviados às 9h:", "", ...report].join("\n"),
        );
        return Response.json({ offline: offline.length });
      },
    },
  },
});
