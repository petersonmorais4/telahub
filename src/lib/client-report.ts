// Monthly exhibition report sent to each advertiser by e-mail.

export interface ReportLogRow {
  screen_id: string | null;
}

export interface ScreenInfo {
  name: string;
  location: string | null;
}

/** Previous calendar month in São Paulo time (UTC-3), as UTC ISO bounds. */
export function previousMonthRange(now = new Date()) {
  const sp = new Date(now.getTime() - 3 * 3600_000);
  const year = sp.getUTCFullYear();
  const month = sp.getUTCMonth(); // current month index
  const start = new Date(Date.UTC(year, month - 1, 1, 3));
  const end = new Date(Date.UTC(year, month, 1, 3));
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 15)),
  );
  return { start: start.toISOString(), end: end.toISOString(), label };
}

/** Previous Monday–Sunday week in São Paulo time (UTC-3), as UTC ISO bounds. */
export function previousWeekRange(now = new Date()) {
  const sp = new Date(now.getTime() - 3 * 3600_000);
  const dow = (sp.getUTCDay() + 6) % 7; // 0 = Monday
  const thisMonday = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate() - dow, 3);
  const start = new Date(thisMonday - 7 * 86400_000);
  const end = new Date(thisMonday);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);
  const label = `${fmt(start)} a ${fmt(new Date(end.getTime() - 1))}`;
  return { start: start.toISOString(), end: end.toISOString(), label };
}

export function summarize(logs: ReportLogRow[], durationSeconds: number, screens: Map<string, ScreenInfo>) {
  const perScreen = new Map<string, number>();
  for (const log of logs) {
    const key = log.screen_id ?? "";
    perScreen.set(key, (perScreen.get(key) ?? 0) + 1);
  }
  const rows = [...perScreen.entries()]
    .map(([id, count]) => {
      const s = screens.get(id);
      return { name: s?.name ?? "Tela removida", location: s?.location ?? null, count };
    })
    .sort((a, b) => b.count - a.count);
  return {
    total: logs.length,
    minutes: Math.round((logs.length * durationSeconds) / 60),
    screens: rows.length,
    rows,
  };
}

export const EMAIL_LOGO_URL =
  "https://telahub.app/__l5e/assets-v1/a3429117-1023-4c1e-87dc-40ce130fcaa4/telahub-logo-oficial.png";

export const TELAHUB_LOGO_URL =
  "https://telahub.app/__l5e/assets-v1/a3429117-1023-4c1e-87dc-40ce130fcaa4/telahub-logo-oficial.png";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function reportHtml(input: {
  clientName: string | null;
  adTitle: string;
  monthLabel: string;
  summary: ReturnType<typeof summarize>;
}) {
  const { summary } = input;
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const card = (value: string, label: string) =>
    `<td style="padding:6px;width:33%"><div style="background:#111a17;border:1px solid #1f3a31;border-radius:12px;padding:16px;text-align:center"><div style="font-size:26px;font-weight:700;color:#2ee59d">${value}</div><div style="font-size:12px;color:#9fb5ad;margin-top:4px">${label}</div></div></td>`;
  const rows = summary.rows
    .map(
      (r) =>
        `<tr><td style="padding:10px;border-bottom:1px solid #1f3a31;color:#e6f2ee">${esc(r.name)}${r.location ? `<div style="font-size:12px;color:#9fb5ad">${esc(r.location)}</div>` : ""}</td><td style="padding:10px;border-bottom:1px solid #1f3a31;text-align:right;color:#2ee59d;font-weight:600">${fmt(r.count)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#070b0a;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070b0a;padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="background:#000000;height:28px;line-height:28px;font-size:0;border-radius:12px 12px 0 0">&nbsp;</td></tr><tr><td style="height:20px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:0 6px;color:#e6f2ee"><h1 style="font-size:22px;margin:0 0 8px">Relatório de exibição — ${esc(input.monthLabel)}</h1>
<p style="color:#9fb5ad;margin:0 0 16px">${input.clientName ? `Olá, ${esc(input.clientName)}! ` : ""}Veja como o anúncio <strong style="color:#e6f2ee">${esc(input.adTitle)}</strong> foi exibido na rede TelaHUB.</p></td></tr>
<tr><td><table width="100%" cellpadding="0" cellspacing="0"><tr>${card(fmt(summary.total), "exibições")}${card(fmt(summary.minutes), "minutos em tela")}${card(fmt(summary.screens), "telas")}</tr></table></td></tr>
<tr><td style="padding:20px 6px 0"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0c1311;border:1px solid #1f3a31;border-radius:12px"><tr><th style="padding:10px;text-align:left;color:#9fb5ad;font-size:12px">LOCAL</th><th style="padding:10px;text-align:right;color:#9fb5ad;font-size:12px">EXIBIÇÕES</th></tr>${rows || `<tr><td colspan="2" style="padding:14px;color:#9fb5ad">Sem exibições no período.</td></tr>`}</table></td></tr>
<tr><td style="padding:16px 6px 0;color:#9fb5ad;font-size:13px">📎 Em anexo, o PDF com o histórico completo de exibições (data, horário e local).</td></tr>
<tr><td style="padding:24px 6px;color:#9fb5ad;font-size:13px">Dúvidas ou quer ampliar sua campanha? Fale conosco no WhatsApp: <a href="https://wa.me/5511964424040" style="color:#2ee59d">wa.me/5511964424040</a><br><br>Equipe TelaHUB · <a href="https://telahub.app" style="color:#2ee59d">telahub.app</a></td></tr>
</table></td></tr></table></body></html>`;
}
