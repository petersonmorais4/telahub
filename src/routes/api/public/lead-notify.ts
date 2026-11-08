import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { brandedHtml } from "@/lib/email-brand";

const OWNER_TO = "petersonmorais4@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const bodySchema = z.object({ kind: z.enum(["advertiser", "partner"]), id: z.string().uuid() });

export const Route = createFileRoute("/api/public/lead-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
        const { kind, id } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const table = kind === "advertiser" ? "advertiser_leads" : "partner_leads";
        const since = new Date(Date.now() - 10 * 60_000).toISOString();
        // Only notify once, and only for leads just created.
        const { data: row } = await supabaseAdmin
          .from(table)
          .update({ notified_at: new Date().toISOString() })
          .eq("id", id)
          .is("notified_at", null)
          .gte("created_at", since)
          .select("*")
          .maybeSingle();
        if (!row) return Response.json({ ok: true });

        const r = row as Record<string, string>;
        const fields: [string, string][] =
          kind === "advertiser"
            ? [["Empresa", r.company], ["Contato", r.name], ["E-mail", r.email], ["Telefone", r.phone]]
            : [["Estabelecimento", r.business_name], ["CNPJ", r.cnpj], ["Endereço", r.address]];
        const title = kind === "advertiser"
          ? r.company?.startsWith("[Indicação") ? "Nova indicação (Indique e Ganhe)" : "Novo interessado em anunciar"
          : "Novo interessado em ser parceiro";
        const html = `<h2 style="margin:0 0 12px">${esc(title)}</h2>
<table style="border-collapse:collapse">${fields
          .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af">${k}</td><td style="padding:4px 0"><strong>${esc(v ?? "")}</strong></td></tr>`)
          .join("")}</table>
<p style="margin-top:16px">O lead já foi adicionado ao Funil de Vendas na etapa Prospecção.</p>`;
        const raw = b64(
          [`To: ${OWNER_TO}`, `Subject: ${header(`TelaHUB — ${title}`)}`, "MIME-Version: 1.0", 'Content-Type: text/html; charset="UTF-8"', "", brandedHtml(html)].join("\r\n"),
        ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
          await supabaseAdmin.from(table).update({ notified_at: null }).eq("id", id);
          return Response.json({ ok: false }, { status: 502 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
