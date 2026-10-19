import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "telahub_screen_code";

export const Route = createFileRoute("/app")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { reset?: string } =>
    search["reset"] !== undefined ? { reset: String(search["reset"]) } : {},
  head: () => ({
    meta: [
      { title: "TelaHUB — Aplicativo da tela" },
      { name: "description", content: "Configure o código da tela TelaHUB e inicie a exibição dos anúncios." },
      { property: "og:title", content: "TelaHUB — Aplicativo da tela" },
      { property: "og:description", content: "Configure o código da tela TelaHUB e inicie a exibição dos anúncios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppStart,
});

type Lookup = "found" | "missing" | "offline";

async function lookupScreen(code: string): Promise<Lookup> {
  try {
    const { data, error } = await supabase.from("screens").select("code").eq("code", code).maybeSingle();
    if (error) return "offline";
    return data ? "found" : "missing";
  } catch {
    return "offline";
  }
}

function normalize(v: string) {
  return v.toUpperCase().replace(/\s+/g, "");
}

function AppStart() {
  const navigate = useNavigate();
  const { reset } = Route.useSearch();
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = (c: string) => navigate({ to: "/player/$code", params: { code: c } });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (reset) {
        localStorage.removeItem(STORAGE_KEY);
        setChecking(false);
        return;
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return setChecking(false);
      const res = await lookupScreen(saved);
      if (cancelled) return;
      if (res === "missing") {
        localStorage.removeItem(STORAGE_KEY);
        setChecking(false);
      } else {
        go(saved);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  useEffect(() => {
    if (!checking) inputRef.current?.focus();
  }, [checking]);

  const submit = async () => {
    const c = normalize(code);
    if (!c || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await lookupScreen(c);
    setSubmitting(false);
    if (res === "found") {
      localStorage.setItem(STORAGE_KEY, c);
      go(c);
    } else if (res === "missing") {
      setError("Código não encontrado. Confira e tente de novo.");
      inputRef.current?.focus();
    } else {
      setError("Sem conexão com a internet. Verifique a rede e tente de novo.");
      inputRef.current?.focus();
    }
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-10 px-8 text-foreground"
      style={{ background: "#040c0b" }}
    >
      <BrandLogo className="h-24 w-auto" />
      {checking ? (
        <p className="text-3xl text-muted-foreground">Carregando…</p>
      ) : (
        <form
          className="flex w-full max-w-3xl flex-col items-center gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="screen-code" className="text-5xl font-bold">
            Digite o código da tela
          </label>
          <input
            id="screen-code"
            ref={inputRef}
            value={code}
            onChange={(e) => {
              setCode(normalize(e.target.value));
              setError(null);
            }}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            className="w-full rounded-2xl border-4 border-border bg-card px-8 py-6 text-center font-mono text-6xl uppercase tracking-[0.3em] text-foreground outline-none focus:border-primary focus:ring-8 focus:ring-primary/60"
            placeholder="ABC123"
          />
          {error && (
            <p role="alert" className="text-3xl font-semibold text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-primary px-8 py-6 text-4xl font-bold text-primary-foreground outline-none focus:ring-8 focus:ring-foreground focus:ring-offset-4 focus:ring-offset-background disabled:opacity-60"
          >
            {submitting ? "Verificando…" : "Abrir exibição"}
          </button>
        </form>
      )}
    </main>
  );
}
