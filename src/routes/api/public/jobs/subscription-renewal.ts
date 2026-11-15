import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { reportHtml, summarize, EMAIL_LOGO_URL, type ScreenInfo } from "@/lib/client-report";
import { brandedHtml } from "@/lib/email-brand";
import { reportPdf } from "@/lib/client-report-pdf";
import { isWithinBusinessHours } from "@/lib/business-hours";
import { billingReminders } from "@/lib/billing";

const ADMIN_TO = "petersonmorais4@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const WHATSAPP = "https://wa.me/5511964424040";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const bytesB64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n");
};
const brDate = (d: string) => d.split("-").reverse().join("/");

async function sendMail(to: string, subject: string, html: string, attachment?: { filename: string; data: Uint8Array }) {
  const ct = 'Content-Type: text/html; charset="UTF-8"';
  const lines = [`To: ${to}`, `Subject: ${header(subject)}`, "MIME-Version: 1.0"];
  if (attachment) {
    const bd = `telahub-${crypto.randomUUID()}`;
    lines.push(`Content-Type: multipart/mixed; boundary="${bd}"`, "", `--${bd}`, ct, "", html, `--${bd}`,
      `Content-Type: application/pdf; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64", "", bytesB64(attachment.data), `--${bd}--`);
  } else lines.push(ct, "", html);
  const raw = b64(lines.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
    console.error(`Gmail send failed [${res.status}]: ${await res.text()}`);
    return `erro ${res.status}`;
  }
  return null;
}

const renewalBlock = (due: string) =>
  `<tr><td style="padding:24px 6px 0"><div style="background:#0f2a20;border:1px solid #2ee59d;border-radius:12px;padding:20px;text-align:center;color:#e6f2ee"><div style="font-size:18px;font-weight:700;margin-bottom:6px">Seu pacote vence em ${brDate(due)}</div><div style="color:#9fb5ad;font-size:14px;margin-bottom:16px">Renove agora e mantenha seu anúncio no ar, sem interrupções.</div><a href="${WHATSAPP}" style="display:inline-block;background:#2ee59d;color:#04110c;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px">Renovar pelo WhatsApp</a></div></td></tr>`;

function todaySP() {
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/jobs/subscription-renewal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = todaySP();

        const [revRes, contactsRes, screensRes] = await Promise.all([
          supabaseAdmin.from("revenues").select("media_id, client_name, amount, payment_date, recurrence_days, recurring"),
          supabaseAdmin.from("media_contacts").select("media_id, client_name, client_email, media(title, duration)"),
          supabaseAdmin.from("screens").select("id, name, location, business_hours"),
        ]);
        for (const r of [revRes, contactsRes, screensRes]) if (r.error) return Response.json({ error: r.error.message }, { status: 500 });

        const due = billingReminders((revRes.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })), today, 2)
          .filter((r) => r.daysLeft === 2 || r.daysLeft === 0);
        if (due.length === 0) return Response.json({ renewal: 0, completed: 0 });

        const contacts = new Map((contactsRes.data ?? []).map((c) => [c.media_id, c]));
        const screens = new Map<string, ScreenInfo>();
        const hours = new Map<string, unknown>();
        for (const s of screensRes.data ?? []) {
          if (/teste/i.test(s.name)) continue;
          screens.set(s.id, { name: s.name, location: s.location });
          hours.set(s.id, s.business_hours);
        }
        let logoPng: Uint8Array | null = null;
        try { const r = await fetch(EMAIL_LOGO_URL); if (r.ok) logoPng = new Uint8Array(await r.arrayBuffer()); } catch { /* sem logo */ }

        const report: string[] = [];
        for (const d of due) {
          const contact = d.last.media_id ? contacts.get(d.last.media_id) : undefined;
          const media = (contact?.media ?? null) as { title: string; duration: number } | null;
          const name = contact?.client_name || d.last.client_name;

          if (d.daysLeft === 0) {
            const err = await sendMail(ADMIN_TO, `TelaHUB: pacote de ${d.last.client_name} concluído hoje`, brandedHtml([
              "Olá, Peterson!", "",
              `O assinante ${d.last.client_name}${media ? ` (anúncio "${media.title}")` : ""} completou hoje os ${d.last.recurrence_days || 30} dias do pacote.`,
              `Último pagamento: ${brDate(d.last.payment_date)} · Valor: ${d.last.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
              "", "Confirme a renovação com o cliente e registre o novo pagamento no Financeiro.",
            ].join("\n")));
            report.push(`concluído: ${d.last.client_name} ${err ? `(falha ${err})` : "(aviso enviado)"}`);
            continue;
          }

          if (!media || !contact?.client_email || !d.last.media_id) {
            report.push(`renovação: ${d.last.client_name} sem e-mail/anúncio cadastrado`);
            continue;
          }
          const start = new Date(`${d.last.payment_date}T03:00:00Z`).toISOString();
          const end = new Date().toISOString();
          const logs: { screen_id: string | null; played_at: string }[] = [];
          for (let from = 0; ; from += 1000) {
            const { data, error } = await supabaseAdmin.from("play_logs").select("screen_id, played_at")
              .eq("media_id", d.last.media_id).gte("played_at", start).lt("played_at", end)
              .order("played_at", { ascending: true }).range(from, from + 999);
            if (error) return Response.json({ error: error.message }, { status: 500 });
            logs.push(...(data ?? []).filter((l) => l.screen_id && screens.has(l.screen_id) && isWithinBusinessHours(hours.get(l.screen_id) as never, l.played_at)));
            if (!data || data.length < 1000) break;
          }
          const label = `${brDate(d.last.payment_date)} a ${brDate(today)}`;
          const summary = summarize(logs, media.duration || 10, screens);
          const pdf = await reportPdf({
            clientName: name, adTitle: media.title, periodLabel: label, summary, logoPng,
            plays: logs.map((l) => ({ playedAt: l.played_at, screen: screens.get(l.screen_id!)?.name ?? "Tela removida" })),
          });
          const html = reportHtml({ clientName: name, adTitle: media.title, monthLabel: label, summary })
            .replace(/<tr><td style="padding:16px 6px 0;color:#9fb5ad;font-size:13px">📎/, `${renewalBlock(d.dueDate)}<tr><td style="padding:16px 6px 0;color:#9fb5ad;font-size:13px">📎`);
          const slug = media.title.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "anuncio";
          const err = await sendMail(contact.client_email, `TelaHUB: seu pacote vence em 2 dias — veja seus resultados`, html,
            { filename: `relatorio-telahub-${slug}.pdf`, data: pdf });
          report.push(`renovação: ${d.last.client_name} → ${contact.client_email} ${err ? `(falha ${err})` : `(enviado, ${summary.total} exibições)`}`);
        }
        console.log(report.join("\n"));
        return Response.json({ results: report });
      },
    },
  },
});
