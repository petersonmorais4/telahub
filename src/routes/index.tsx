import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MonitorPlay, ListOrdered, CalendarClock, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TelaHub — Painel de mídia indoor para TVs" },
      {
        name: "description",
        content:
          "Cadastre telas, envie anúncios em imagem ou vídeo, monte playlists com agendamento e exiba em qualquer TV por um link público.",
      },
      { property: "og:title", content: "TelaHub — Painel de mídia indoor para TVs" },
      {
        property: "og:description",
        content: "Gestão de anúncios e player em tela cheia para recepções, elevadores e lojas.",
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: MonitorPlay, title: "Telas", text: "Cadastre cada TV com um código e link exclusivos." },
  { icon: Images, title: "Anúncios", text: "Imagens e vídeos com período de veiculação." },
  { icon: ListOrdered, title: "Playlists", text: "Ordem por arrastar e soltar, em loop contínuo." },
  { icon: CalendarClock, title: "Agendamentos", text: "Dias da semana e horários por campanha." },
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
          <Button asChild>
            <Link to={signedIn ? "/painel" : "/auth"}>{signedIn ? "Abrir painel" : "Entrar"}</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Digital signage</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Anúncios no ar em todas as suas telas, controlados de um só lugar
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Um painel para organizar as campanhas e um link público por tela para rodar em Smart TVs,
          Chromecast ou mini-PC — sem login e sem instalar nada.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to={signedIn ? "/painel" : "/auth"}>
              {signedIn ? "Ir para o painel" : "Acessar o painel"}
            </Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="panel p-6">
              <f.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
