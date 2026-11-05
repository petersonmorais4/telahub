import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { previousWeekRange, reportHtml, summarize, type ScreenInfo } from "@/lib/client-report";

const ADMIN_TO = "petersonmorais4@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

async function sendMail(to: string, subject: string, body: string, html: boolean) {
  const raw = b64(
    [
      `To: ${to}`,
      `Subject: ${header(subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: ${html ? "text/html" : "text/plain"}; charset="UTF-8"`,
      "",
      body,
    ].join("\r\n"),
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
        for (const s of screensRes.data ?? []) screens.set(s.id, { name: s.name, location: s.location });

        const report: string[] = [];
        for (const c of contactsRes.data ?? []) {
          const media = c.media as { title: string; duration: number } | null;
          if (!media || !c.client_email) continue;
          const logs: { screen_id: string | null }[] = [];
          for (let from = 0; ; from += 1000) {
            const { data, error } = await supabaseAdmin
              .from("play_logs")
              .select("screen_id")
              .eq("media_id", c.media_id)
              .gte("played_at", range.start)
              .lt("played_at", range.end)
              .range(from, from + 999);
            if (error) return Response.json({ error: error.message }, { status: 500 });
            logs.push(...(data ?? []));
            if (!data || data.length < 1000) break;
          }
          const summary = summarize(logs, media.duration || 10, screens);
          const err = await sendMail(
            c.client_email,
            `TelaHUB: relatório semanal de exibição (${range.label})`,
            reportHtml({ clientName: c.client_name, adTitle: media.title, monthLabel: range.label, summary }),
            true,
          );
          report.push(
            `- ${media.title} → ${c.client_email}: ${err ? `falha (${err})` : `enviado (${summary.total} exibições)`}`,
          );
        }

        if (report.length > 0) {
          await sendMail(
            ADMIN_TO,
            `TelaHUB: relatórios semanais (${range.label}) enviados`,
            ["Relatórios semanais enviados aos anunciantes:", "", ...report].join("\n"),
            false,
          );
        }
        return Response.json({ sent: report.length });
      },
    },
  },
});
