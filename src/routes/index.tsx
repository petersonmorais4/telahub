import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Users, MonitorPlay, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TelaHub — Anuncie em telas de alta circulação" },
      {
        name: "description",
        content:
          "Sua marca em recepções, elevadores, academias e áreas comuns de condomínios. Anuncie em vídeo ou imagem e alcance seu público onde ele realmente está.",
      },
      { property: "og:title", content: "TelaHub — Anuncie em telas de alta circulação" },
      {
        property: "og:description",
        content:
          "Alcance seu público em locais de alta circulação com anúncios em tela cheia.",
      },
    ],
  }),
  component: Index,
});

const benefits = [
  {
    icon: Eye,
    title: "Alta fixação",
    text: "Telas em pontos de espera e circulação, onde o público olha naturalmente.",
  },
  {
    icon: Users,
    title: "Público segmentado",
    text: "Escolha horários e dias para impactar quem você quer, no momento certo.",
  },
  {
    icon: MonitorPlay,
    title: "Vídeo e imagem",
    text: "Anúncios em tela cheia, com transições suaves e qualidade de TV.",
  },
  {
    icon: BarChart3,
    title: "Métricas claras",
    text: "Relatório de exibições para você saber exatamente o que foi veiculado.",
  },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(Boolean(data.session));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <BrandLogo className="h-12 w-auto" />
          <Link
            to={signedIn ? "/painel" : "/auth"}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {signedIn ? "Abrir painel" : "Acesso da equipe"}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Mídia indoor
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Sua marca onde as pessoas realmente estão
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Anuncie em recepções, elevadores, academias e áreas comuns de condomínios.
          Seu vídeo ou imagem em tela cheia, no momento e no local certo para ser lembrado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/anunciar">Quero anunciar</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/parceiro">Seja Parceiro</Link>
          </Button>
        </div>

        <div id="como-funciona" className="mt-24 scroll-mt-24">
          <h2 className="text-2xl font-bold">Por que anunciar na TelaHub?</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="panel p-6">
                <b.icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="mt-4 text-base font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </div>

      </section>
    </main>
  );
}
