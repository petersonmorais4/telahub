import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { previousWeekRange, reportHtml, summarize, EMAIL_LOGO_URL, type ScreenInfo } from "@/lib/client-report";
import { brandedHtml } from "@/lib/email-brand";
import { reportPdf } from "@/lib/client-report-pdf";

const ADMIN_TO = "petersonmorais4@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

const bytesB64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n");
};

async function sendMail(
  to: string,
  subject: string,
  body: string,
  html: boolean,
  attachment?: { filename: string; data: Uint8Array },
) {
  const contentType = `Content-Type: ${html ? "text/html" : "text/plain"}; charset="UTF-8"`;
  const lines = [`To: ${to}`, `Subject: ${header(subject)}`, "MIME-Version: 1.0"];
  if (attachment) {
    const boundary = `telahub-${crypto.randomUUID()}`;
    lines.push(
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      contentType,
      "",
      body,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      bytesB64(attachment.data),
      `--${boundary}--`,
    );
  } else {
    lines.push(contentType, "", body);
  }
  const raw = b64(lines.join("\r\n"))
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

export const Route = createFileRoute("/api/public/jobs/client-exhibition-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const range = previousWeekRange();

        const [contactsRes, screensRes] = await Promise.all([
          supabaseAdmin
            .from("media_contacts")
            .select("media_id, client_name, client_email, send_report, media(title, duration)")
            .eq("send_report", true)
            .not("client_email", "is", null),
          supabaseAdmin.from("screens").select("id, name, location"),
        ]);
        if (contactsRes.error) return Response.json({ error: contactsRes.error.message }, { status: 500 });
        if (screensRes.error) return Response.json({ error: screensRes.error.message }, { status: 500 });

        const screens = new Map<string, ScreenInfo>();
        // Test screens never appear in client reports.
        const testScreenIds = new Set<string>();
        for (const s of screensRes.data ?? []) {
          if (/teste/i.test(s.name)) testScreenIds.add(s.id);
          else screens.set(s.id, { name: s.name, location: s.location });
        }

        let logoPng: Uint8Array | null = null;
        try {
          const r = await fetch(EMAIL_LOGO_URL);
          if (r.ok) logoPng = new Uint8Array(await r.arrayBuffer());
        } catch {
          logoPng = null;
        }

        const report: string[] = [];
        for (const c of contactsRes.data ?? []) {
          const media = c.media as { title: string; duration: number } | null;
          if (!media || !c.client_email) continue;
          const logs: { screen_id: string | null; played_at: string }[] = [];
          for (let from = 0; ; from += 1000) {
            const { data, error } = await supabaseAdmin
              .from("play_logs")
              .select("screen_id, played_at")
              .eq("media_id", c.media_id)
              .gte("played_at", range.start)
              .lt("played_at", range.end)
              .order("played_at", { ascending: true })
              .range(from, from + 999);
            if (error) return Response.json({ error: error.message }, { status: 500 });
            logs.push(...(data ?? []).filter((l) => !l.screen_id || !testScreenIds.has(l.screen_id)));
            if (!data || data.length < 1000) break;
          }
          const summary = summarize(logs, media.duration || 10, screens);
          const pdf = await reportPdf({
            clientName: c.client_name,
            adTitle: media.title,
            periodLabel: range.label,
            summary,
            plays: logs.map((l) => ({
              playedAt: l.played_at,
              screen: (l.screen_id && screens.get(l.screen_id)?.name) || "Tela removida",
            })),
            logoPng,
          });
          const slug = media.title.normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "anuncio";
          const err = await sendMail(
            c.client_email,
            `TelaHUB: relatório semanal de exibição (${range.label})`,
            reportHtml({ clientName: c.client_name, adTitle: media.title, monthLabel: range.label, summary }),
            true,
            { filename: `relatorio-telahub-${slug}.pdf`, data: pdf },
          );
          report.push(
            `- ${media.title} → ${c.client_email}: ${err ? `falha (${err})` : `enviado (${summary.total} exibições)`}`,
          );
        }

        if (report.length > 0) {
          await sendMail(
            ADMIN_TO,
            `TelaHUB: relatórios semanais (${range.label}) enviados`,
            brandedHtml(["Relatórios semanais enviados aos anunciantes:", "", ...report].join("\n")),
            true,
          );
        }
        return Response.json({ sent: report.length });
      },
    },
  },
});
