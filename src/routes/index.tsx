import estudioEc from "@/assets/estudio_ec.png.asset.json";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";

const NetworkMap = lazy(() => import("@/components/NetworkMap").then((m) => ({ default: m.NetworkMap })));
import { Eye, Users, MonitorPlay, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import academiaTv from "@/assets/home-gallery/academia-new.png.asset.json";
import farmaciaTv from "@/assets/home-gallery/farmacia-new.png.asset.json";
import barbeariaTv from "@/assets/home-gallery/barbearia-new.png.asset.json";
import localStudioSA from "@/assets/locais/studio-sa-campo-limpo-recepcao.jpg.asset.json";
import localBarbearia from "@/assets/locais/evandro-barbearia-campo-limpo.jpg.asset.json";
import localStudioJundiai from "@/assets/locais/studio-sa-jundiai-recepcao.jpg.asset.json";
import localVidaPilates from "@/assets/locais/vida-pilates-jundiai.jpg.asset.json";
import localNutrifit from "@/assets/locais/nutrifit-lounge-jundiai.jpg.asset.json";
import localVibeFit from "@/assets/locais/vibe-fit-campo-limpo.jpg.asset.json";
import localFazendinhaJoseValter from "@/assets/locais/fazendinha-do-leo-jose-valter.jpg.asset.json";
import localFazendinhaCentro from "@/assets/locais/fazendinha-do-leo-centro.jpg.asset.json";
import localJBR from "@/assets/locais/restaurante-jbr-campo-limpo.jpg.asset.json";
import localAgroPeska from "@/assets/locais/agro-peska-tamakalu-varzea.jpg.asset.json";
import localECPilates from "@/assets/locais/ec-pilates-varzea.jpg.asset.json";
import mercadoTv from "@/assets/home-gallery/mercado-new.png.asset.json";

const places = [
  { alt: "Tela TelaHUB no Studio S&A, Campo Limpo Paulista", img: localStudioSA.url },
  { alt: "Tela TelaHUB na Evandro Barbearia, Campo Limpo Paulista", img: localBarbearia.url },
  { alt: "Tela TelaHUB na Vibe Fit, Estrada da Bragantina, Campo Limpo Paulista", img: localVibeFit.url },
  { alt: "Tela TelaHUB na Fazendinha do Léo, Rua José Valter Pacheco, Campo Limpo Paulista", img: localFazendinhaJoseValter.url },
  { alt: "Tela TelaHUB na Fazendinha do Léo Centro, Campo Limpo Paulista", img: localFazendinhaCentro.url },
  { alt: "Tela TelaHUB no Restaurante JBR, Campo Limpo Paulista", img: localJBR.url },
  { alt: "Tela TelaHUB no Studio S&A, unidade Jundiaí", img: localStudioJundiai.url },
  { alt: "Tela TelaHUB no Vida Pilates, Jundiaí", img: localVidaPilates.url },
  { alt: "Tela TelaHUB no Nutrifit Lounge, Av. Nove de Julho, Jundiaí", img: localNutrifit.url },
  { alt: "Tela TelaHUB na Agro Peska Tamakalu, Várzea Paulista", img: localAgroPeska.url },
  { alt: "Tela TelaHUB no EC Pilates, Várzea Paulista", img: localECPilates.url },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Anuncie em telas de salões, academias e restaurantes" },
      {
        name: "description",
        content:
          "Anúncios em vídeo ou imagem nas telas de salões, barbearias, academias e restaurantes de Jundiaí e Região. Relatório de exibições para acompanhar sua campanha.",
      },
      { property: "og:title", content: "TelaHUB — Anuncie em telas de salões, academias e restaurantes" },
      {
        property: "og:description",
        content:
          "Anúncios em vídeo ou imagem nas telas de salões, barbearias, academias e restaurantes de Jundiaí e Região. Relatório de exibições para acompanhar sua campanha.",
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
  { src: estudioEc.url, alt: "Anúncio exibido em uma TV do Estúdio EC", position: "object-center" },
  { src: academiaTv.url, alt: "Anúncio exibido em uma TV de academia", position: "object-center" },
  { src: farmaciaTv.url, alt: "Anúncio exibido em uma TV de farmácia", position: "object-center" },
  { src: barbeariaTv.url, alt: "Anúncio exibido em uma TV de barbearia", position: "object-center" },
  { src: mercadoTv.url, alt: "Anúncio exibido em uma TV de supermercado", position: "object-center" },
];

function shuffled(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function PlacesCarousel() {
  const n = places.length;
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: n }, (_, i) => i));
  const [pos, setPos] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fading, setFading] = useState(false);
  const [tick, setTick] = useState(0);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setOrder(shuffled(n));
  }, [n]);

  const transition = (fn: () => void) => {
    if (fadeRef.current) clearTimeout(fadeRef.current);
    setFading(true);
    fadeRef.current = setTimeout(() => {
      fn();
      setFading(false);
    }, 400);
  };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      transition(() => {
        setPos((p) => {
          const next = p + 1;
          if (next >= n) {
            setOrder(shuffled(n));
            return 0;
          }
          return next;
        });
      });
    }, 4000);
    return () => clearInterval(id);
  }, [paused, tick, n]);

  useEffect(() => () => { if (fadeRef.current) clearTimeout(fadeRef.current); }, []);

  const currentPlace = order[pos] ?? 0;
  const goTo = (placeIdx: number) => {
    if (placeIdx === currentPlace) return;
    setTick((t) => t + 1);
    transition(() => setPos(order.indexOf(placeIdx)));
  };

  const visible = [0, 1, 2].map((i) => places[order[(pos + i) % n] ?? 0]!);
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={`mt-8 grid gap-4 grid-cols-1 sm:grid-cols-3 transition-opacity duration-400 ${fading ? "opacity-0" : "opacity-100"}`}>
        {visible.map((p, i) => (
          <div key={`${p.img}-${i}`} className={`overflow-hidden rounded-xl border border-border bg-card ${i > 0 ? "hidden sm:block" : ""}`}>
            <img src={p.img} alt={p.alt} className="aspect-[9/19] w-full object-cover object-bottom" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {places.map((p, i) => (
          <button
            key={p.img}
            type="button"
            aria-label={`Ver foto ${i + 1}`}
            aria-current={i === currentPlace}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${i === currentPlace ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Index() {
  const [activeImage, setActiveImage] = useState(0);

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
      <WhatsAppButton />
      <section className="relative isolate flex min-h-[70vh] max-h-[800px] items-start overflow-hidden">
        <header className="absolute left-0 right-0 top-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <BrandLogo className="h-20 w-auto" />
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

        <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-40 sm:pb-20 sm:pt-44">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Mídia indoor em Jundiaí e Região
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Seu anúncio nas telas de salões, academias e restaurantes da região
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Anúncios de 15 segundos em telas nas recepções e áreas de espera dos nossos parceiros, com relatório de exibições para você acompanhar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/anunciar">Quero anunciar</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-foreground/40 bg-background/40 backdrop-blur-sm">
              <Link to="/parceiro">Seja Parceiro</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="bg-background/40 backdrop-blur-sm">
              <a
                href="https://telahub.app/player/6EEAJK"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ver a grade de anúncios ao vivo"
              >
                <span className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden />
                Ver ao vivo
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div id="como-funciona" className="scroll-mt-24">
          <h2 className="text-2xl font-bold">Por que anunciar na TelaHUB?</h2>
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

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-2xl font-bold">Onde nossas telas estão</h2>
        <PlacesCarousel />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-2xl font-bold">Onde estamos</h2>
        <p className="mt-2 text-sm text-muted-foreground">Pontos da rede TelaHUB onde sua marca pode aparecer.</p>
        <div className="mt-6">
          <ClientOnly fallback={<div className="h-[420px] rounded-xl border border-border bg-card" />}>
            <Suspense fallback={<div className="h-[420px] rounded-xl border border-border bg-card" />}>
              <NetworkMap />
            </Suspense>
          </ClientOnly>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <a
            href="https://www.instagram.com/telahubjundiai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
              <defs>
                <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
                  <stop offset="0%" stopColor="#fdf497" />
                  <stop offset="5%" stopColor="#fdf497" />
                  <stop offset="45%" stopColor="#fd5949" />
                  <stop offset="60%" stopColor="#d6249f" />
                  <stop offset="90%" stopColor="#285AEB" />
                </radialGradient>
              </defs>
              <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
              <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.8" />
              <circle cx="16.4" cy="7.6" r="1" fill="#fff" />
            </svg>
            @telahubjundiai
          </a>
        </div>
      </footer>
    </main>
  );
}
