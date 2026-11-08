import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brandedHtml } from "@/lib/email-brand";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function sessionIdOf(claims: Record<string, unknown>) {
  const sid = claims["session_id"];
  if (typeof sid !== "string" || !sid) throw new Error("Sessão inválida");
  return sid;
}

export const getMfaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sid = sessionIdOf(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("login_mfa")
      .select("verified_at, user_id")
      .eq("session_id", sid)
      .maybeSingle();
    return { verified: !!data?.verified_at && data.user_id === context.userId };
  });

export const sendMfaCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sid = sessionIdOf(context.claims as Record<string, unknown>);
    const email = (context.claims as Record<string, unknown>)["email"];
    if (typeof email !== "string") throw new Error("Conta sem e-mail");
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, "0");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("login_mfa").upsert({
      session_id: sid,
      user_id: context.userId,
      code_hash: await sha256(`${sid}:${code}`),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      attempts: 0,
      verified_at: null,
    });
    if (error) throw new Error(error.message);

    const body = [
      "Olá!",
      "",
      `Seu código de acesso ao painel TelaHUB é: ${code}`,
      "",
      "Ele vale por 10 minutos. Se você não tentou entrar, ignore este e-mail e troque sua senha.",
    ].join("\n");
    const raw = b64(
      [
        `To: ${email}`,
        `Subject: ${header(`Código de acesso TelaHUB: ${code}`)}`,
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
        Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
        "X-Connection-Api-Key": process.env["GOOGLE_MAIL_API_KEY"] ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Gmail send failed [${res.status}]: ${text}`);
      throw new Error("Não foi possível enviar o código por e-mail");
    }
    return { sentTo: email.replace(/^(.{2}).*(@.*)$/, "$1***$2") };
  });

export const verifyMfaCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    const sid = sessionIdOf(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("login_mfa")
      .select("*")
      .eq("session_id", sid)
      .maybeSingle();
    if (!row || row.user_id !== context.userId || !row.code_hash || !row.expires_at)
      return { ok: false, error: "Solicite um novo código." };
    if (new Date(row.expires_at).getTime() < Date.now())
      return { ok: false, error: "Código expirado. Solicite outro." };
    if (row.attempts >= MAX_ATTEMPTS)
      return { ok: false, error: "Muitas tentativas. Solicite outro código." };
    const ok = (await sha256(`${sid}:${data.code}`)) === row.code_hash;
    await supabaseAdmin
      .from("login_mfa")
      .update(
        ok
          ? { verified_at: new Date().toISOString(), code_hash: null }
          : { attempts: row.attempts + 1 },
      )
      .eq("session_id", sid);
    return ok ? { ok: true as const } : { ok: false, error: "Código incorreto." };
  });
