import { TELAHUB_LOGO_URL } from "@/lib/client-report";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Wraps a plain-text email body in the TelaHUB layout with the logo on top. */
export function brandedHtml(text: string) {
  const body = text
    .split("\n")
    .map((l) => (l.trim() ? esc(l).replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#0fb98f">$1</a>') : "&nbsp;"))
    .join("<br>");
  return `<!doctype html><html><body style="margin:0;background:#070b0a;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070b0a"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0c1311;border:1px solid #1f3a31;border-radius:12px;overflow:hidden">
<tr><td align="center" style="background:#070b0a;padding:20px;border-bottom:1px solid #1f3a31"><img src="${TELAHUB_LOGO_URL}" alt="TelaHUB" height="48" style="height:48px;width:auto;display:block"></td></tr>
<tr><td style="padding:24px;color:#e6f2ee;font-size:15px;line-height:1.55">${body}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Splits a comma/semicolon/space separated list into valid e-mail addresses. */
export function parseEmails(value: string | null | undefined) {
  return (value ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}
