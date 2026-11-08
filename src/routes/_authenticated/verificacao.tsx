import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { sendMfaCode, verifyMfaCode } from "@/lib/mfa.functions";

export const Route = createFileRoute("/_authenticated/verificacao")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s["next"] === "string" ? s["next"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Verificação em duas etapas — TelaHub" },
      { name: "description", content: "Confirme o código enviado ao seu e-mail para acessar o painel." },
      { property: "og:title", content: "Verificação em duas etapas — TelaHub" },
      { property: "og:description", content: "Confirme o código enviado ao seu e-mail." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = oauthReturnPath(next) === "/" ? "/painel" : oauthReturnPath(next);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  async function send() {
    setBusy(true);
    try {
      const r = await sendMfaCode();
      setSentTo(r.sentTo);
      toast.success("Código enviado para seu e-mail");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void send();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await verifyMfaCode({ data: { code } });
      if (r.ok) navigate({ href: target, replace: true });
      else toast.error(r.error);
    } catch {
      toast.error("Digite os 6 números do código.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto h-20 w-auto max-w-full" />
          <h1 className="mt-3 text-2xl font-bold">Verificação em duas etapas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sentTo ? `Enviamos um código de 6 números para ${sentTo}.` : "Enviando código para seu e-mail..."}
          </p>
        </div>
        <form className="panel space-y-4 p-6" onSubmit={verify}>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="h-14 text-center text-2xl tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            Confirmar código
          </Button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-primary hover:underline" disabled={busy} onClick={send}>
              Reenviar código
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:underline"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", search: { next: "" } });
              }}
            >
              Sair
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
