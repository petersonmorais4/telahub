import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // SSR has no localStorage session and would redirect signed-in users.
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search["authorization_id"] === "string" ? search["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    if (data && "redirect_url" in data) throw redirect({ href: data.redirect_url });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar esta solicitação: {error instanceof Error ? error.message : String(error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const client = details && "client" in details ? details.client : undefined;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data && "redirect_url" in data ? data.redirect_url : undefined;
    if (!target) {
      setBusy(false);
      setError("Nenhum redirecionamento devolvido pelo servidor de autorização.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">Conectar {client?.name ?? "um aplicativo"} à sua conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Isso permite que {client?.name ?? "o cliente"} use este aplicativo com a sua conta.
        </p>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-6 flex justify-center gap-3">
          <button disabled={busy} onClick={() => decide(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            Aprovar
          </button>
          <button disabled={busy} onClick={() => decide(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50">
            Recusar
          </button>
        </div>
      </div>
    </main>
  );
}
