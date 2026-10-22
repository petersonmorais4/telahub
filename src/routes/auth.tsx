import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? search["next"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Entrar no painel — TelaHub" },
      {
        name: "description",
        content: "Acesso restrito ao painel administrativo de mídia indoor: telas, anúncios e playlists.",
      },
      { property: "og:title", content: "Entrar no painel — TelaHub" },
      { property: "og:description", content: "Acesso restrito ao painel administrativo de mídia indoor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const returnTo = oauthReturnPath(next);
  const target = returnTo === "/" ? "/painel" : returnTo;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) navigate({ href: target, replace: true });
    });
    return () => {
      alive = false;
    };
  }, [navigate, target]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    navigate({ href: target, replace: true });
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto h-20 w-auto max-w-full" />
          <h1 className="mt-3 text-2xl font-bold">Painel administrativo</h1>
        </div>

        <div className="panel p-6">
              <form className="space-y-4" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Entrar
                </Button>
              </form>
        </div>
      </div>
    </main>
  );
}
