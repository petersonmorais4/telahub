import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Users, MonitorPlay, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import academiaTv from "@/assets/home-gallery/academia-tv.png.asset.json";
import farmaciaTv from "@/assets/home-gallery/farmacia-tv.png.asset.json";
import elevadorTv from "@/assets/home-gallery/elevador-tv.png.asset.json";
import mercadoTv from "@/assets/home-gallery/mercado-tv.png.asset.json";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const showcaseImages = [
  { src: academiaTv.url, alt: "Anúncio exibido em uma TV de academia", position: "object-[44%_center]" },
  { src: farmaciaTv.url, alt: "Anúncio exibido em uma TV de farmácia", position: "object-[38%_center]" },
  { src: elevadorTv.url, alt: "Anúncio exibido em uma tela de elevador", position: "object-[52%_center]" },
  { src: mercadoTv.url, alt: "Anúncio exibido em uma TV de supermercado", position: "object-center" },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(Boolean(data.session));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const rotation = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % showcaseImages.length);
    }, 5000);

    return () => window.clearInterval(rotation);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="relative isolate flex min-h-svh items-start overflow-hidden">
        <header className="absolute left-0 right-0 top-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <BrandLogo className="h-10 w-auto" />
          </div>
        </header>

        <div className="absolute inset-0 -z-20 bg-background" aria-hidden>
          {showcaseImages.map((image, index) => (
            <img
              key={image.src}
              src={image.src}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover ${image.position} transition-opacity duration-1000 motion-reduce:transition-none ${
                index === activeImage ? "opacity-100" : "opacity-0"
              }`}
              loading={index === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
        <div className="absolute inset-0 -z-10 bg-background/65" aria-hidden />

        <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:pb-20 sm:pt-14">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Mídia indoor
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Sua marca onde as pessoas realmente estão
          </h1>
          <p className="mt-5 max-w-xl text-lg text-foreground/85">
            Anuncie em recepções, elevadores, academias e áreas comuns de condomínios.
            Seu vídeo ou imagem em tela cheia, no momento e no local certo para ser lembrado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/anunciar">Quero anunciar</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-background/70 backdrop-blur-sm">
              <Link to="/parceiro">Seja Parceiro</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div id="como-funciona" className="scroll-mt-24">
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

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <BrandLogo className="h-8 w-auto opacity-80" />
          <Link
            to={signedIn ? "/painel" : "/auth"}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {signedIn ? "Abrir painel" : "Acesso administrador"}
          </Link>
        </div>
      </footer>
    </main>
  );
}
