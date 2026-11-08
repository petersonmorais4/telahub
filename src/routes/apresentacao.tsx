import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

const NetworkMap = lazy(() => import("@/components/NetworkMap").then((m) => ({ default: m.NetworkMap })));
import {
  ArrowRight,
  ChevronDown,
  Handshake,
  MonitorSmartphone,
  Sparkles,
  Wallet,
  Wrench,
} from "lucide-react";

import localStudioSA from "@/assets/locais/studio-sa-campo-limpo.jpg.asset.json";
import localBarbearia from "@/assets/locais/evandro-barbearia.jpg.asset.json";
import localStudioJundiai from "@/assets/locais/studio-sa-jundiai.jpg.asset.json";
import localPilates from "@/assets/locais/pilates-jundiai.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/apresentacao")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Apresentação para parceiros comerciais" },
      {
        name: "description",
        content:
          "Conheça a TelaHUB: mídia digital em locais reais. Leve telas ao seu espaço, valorize o ambiente e gere novas oportunidades.",
      },
      { property: "og:title", content: "TelaHUB — Apresentação para parceiros comerciais" },
      {
        property: "og:description",
        content: "Mídia digital em locais reais, conectando negócios e pessoas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Apresentacao,
});

const stats = [
  { value: "R$ 3,12 bi", text: "investidos em mídia exterior (OOH) no Brasil em 2024", source: "Painel Cenp 2024" },
  { value: "+22,7%", text: "de crescimento no investimento em OOH em 2024", source: "Painel Cenp 2024" },
  { value: "71%", text: "dos profissionais de marketing pretendem aumentar o investimento em DOOH", source: "Panorama DOOH 2025" },
];

const steps = [
  "Instalação das telas",
  "Captação de anunciantes",
  "Cadastro das peças publicitárias",
  "Organização em playlists",
  "Exibição e gestão da operação",
];

const benefits = [
  { icon: Sparkles, title: "Ambiente mais moderno", text: "Tecnologia e conteúdo relevante valorizam o seu espaço." },
  { icon: Handshake, title: "Parcerias comerciais", text: "Divulgue seus produtos e os de parceiros locais em toda a rede." },
  { icon: Wallet, title: "Contrapartidas financeiras", text: "Potencial de remuneração pela disponibilização do espaço." },
  { icon: Wrench, title: "Zero burocracia", text: "Toda a operação é feita pela TelaHUB, de ponta a ponta." },
];

const places = [
  { alt: "Tela TelaHUB no Studio S&A, Campo Limpo Paulista", img: localStudioSA.url },
  { alt: "Tela TelaHUB na Evandro Barbearia, Campo Limpo Paulista", img: localBarbearia.url },
  { alt: "Tela TelaHUB no Ed. Jatobá, Jundiaí", img: localStudioJundiai.url },
  { alt: "Tela TelaHUB em estúdio de pilates, Jundiaí", img: localPilates.url },
];

const slideIds = ["abertura", "mercado", "como-funciona", "beneficios", "locais", "mapa", "contato"];

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShown(Boolean(e?.isIntersecting)), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

function Apresentacao() {
  const mainRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(slideIds.indexOf(e.target.id))),
      { root, threshold: 0.55 },
    );
    slideIds.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    const onKey = (ev: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(ev.key)) return;
      ev.preventDefault();
      setActive((cur) => {
        const next = Math.max(0, Math.min(slideIds.length - 1, cur + (ev.key === "ArrowDown" || ev.key === "PageDown" ? 1 : -1)));
        document.getElementById(slideIds[next] ?? "")?.scrollIntoView({ behavior: "smooth" });
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => { io.disconnect(); window.removeEventListener("keydown", onKey); };
  }, []);

  const go = (i: number) => document.getElementById(slideIds[i] ?? "")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main ref={mainRef} className="h-screen snap-y snap-mandatory overflow-y-auto overflow-x-hidden scroll-smooth bg-background">
      <nav className="fixed left-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-3 sm:flex" aria-label="Slides">
        {slideIds.map((id, i) => (
          <button
            key={id}
            onClick={() => go(i)}
            aria-label={`Ir para slide ${i + 1}`}
            className={`h-3 rounded-full transition-all ${i === active ? "w-8 bg-primary" : "w-3 bg-muted-foreground/40 hover:bg-muted-foreground"}`}
          />
        ))}
      </nav>
      <Link
        to="/parceiro"
        className="fixed right-0 top-1/2 z-50 hidden -translate-y-1/2 items-center gap-2 rounded-l-xl bg-primary px-3.5 py-6 font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-[var(--shadow-lift)] transition-all duration-300 hover:px-5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex"
        style={{ writingMode: "vertical-rl" }}
      >
        Quero ser parceiro
      </Link>
      <div className="fixed bottom-5 right-6 z-50 font-display text-sm text-muted-foreground">
        {String(active + 1).padStart(2, "0")} / {String(slideIds.length).padStart(2, "0")}
      </div>
      {active < slideIds.length - 1 && (
        <button onClick={() => go(active + 1)} aria-label="Próximo slide" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-bounce text-primary">
          <ChevronDown className="h-7 w-7" />
        </button>
      )}
      {/* Abertura */}
      <section id="abertura" className="relative isolate snap-start min-h-screen flex flex-col justify-center">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 80% 20%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <header className="mx-auto flex max-w-6xl items-center px-6 py-6">
          <Link to="/" aria-label="Página inicial" className="inline-block transition-transform hover:scale-[1.02]">
            <BrandLogo className="h-16 w-auto sm:h-28" />
          </Link>
        </header>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-2 lg:pt-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Mídia digital em locais reais
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] sm:text-6xl">
              Sua marca onde{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                as pessoas estão.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Conectamos negócios e pessoas através de telas instaladas em espaços de alta
              circulação — com toda a gestão feita pela TelaHUB.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/parceiro">
                  Seja parceiro <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#como-funciona">Como funciona</a>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/20 blur-3xl" aria-hidden />
            <img
              src={localStudioSA.url}
              alt="Tela TelaHUB exibindo anúncio no Studio S&A"
              className="aspect-[4/3] w-full rounded-2xl border border-border object-cover object-[center_40%] shadow-[var(--shadow-lift)]"
            />
          </div>
        </div>
      </section>

      {/* Mercado */}
      <section id="mercado" className="border-y border-border bg-card/50 snap-start min-h-screen flex flex-col justify-center">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">
            Um mercado em <span className="text-primary">forte crescimento.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            A mídia digital em ambientes físicos (DOOH) ganha cada vez mais espaço no Brasil,
            com crescimento consistente e alta intenção de investimento das marcas.
          </p>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            {stats.map((s, i) => (
              <Reveal key={s.value} delay={i * 150} className="bg-background p-8 hover:bg-card">
                <p className="font-display text-5xl font-bold text-primary">{s.value}</p>
                <p className="mt-4 text-foreground">{s.text}</p>
                <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
                  Fonte: {s.source}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto w-full max-w-6xl px-6 py-20 snap-start min-h-screen flex flex-col justify-center">
        <div className="flex items-center gap-3 text-primary">
          <MonitorSmartphone className="h-5 w-5" aria-hidden />
          <p className="text-sm font-semibold uppercase tracking-[0.25em]">Como funciona</p>
        </div>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Do espaço à tela, cuidamos de tudo.</h2>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step}><Reveal delay={i * 120} className="panel relative h-full p-6 hover:-translate-y-1 hover:border-primary/60">
              <span className="font-display text-4xl font-bold text-primary/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-4 font-semibold">{step}</p>
            </Reveal></li>
          ))}
        </ol>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="mx-auto w-full max-w-6xl px-6 py-20 snap-start min-h-screen flex flex-col justify-center">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Mais valor <span className="text-primary">para o seu espaço.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Como parceiro TelaHUB, seu estabelecimento ganha uma comunicação moderna, atrativa
              e que gera oportunidades.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 120} className="panel p-6 hover:border-primary/60">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <b.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Onde estamos */}
      <section id="locais" className="mx-auto w-full max-w-6xl px-6 py-20 snap-start min-h-screen flex flex-col justify-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Onde a TelaHUB brilha</h2>
        <div className="mt-10 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {places.map((p, i) => (
            <Reveal key={p.img} delay={i * 120} className="group overflow-hidden rounded-xl border border-border bg-card">
              <img src={p.img} alt={p.alt} className="aspect-[9/19] w-full object-cover object-bottom transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Mapa */}
      <section id="mapa" className="mx-auto w-full max-w-6xl px-6 py-20 snap-start min-h-screen flex flex-col justify-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Nossos pontos</h2>
        <p className="mt-3 text-muted-foreground">Locais onde a rede TelaHUB já está no ar.</p>
        <div className="mt-8">
          <ClientOnly fallback={<div className="h-[420px] rounded-xl border border-border bg-card" />}>
            <Suspense fallback={<div className="h-[420px] rounded-xl border border-border bg-card" />}>
              <NetworkMap />
            </Suspense>
          </ClientOnly>
        </div>
      </section>

      {/* Chamada final */}
      <section id="contato" className="mx-auto w-full max-w-6xl px-6 py-20 snap-start min-h-screen flex flex-col justify-center">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-10 text-center sm:p-16">
          <div
            className="absolute inset-0 -z-0 opacity-50"
            style={{
              background:
                "radial-gradient(50% 80% at 50% 100%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl font-bold sm:text-5xl">Vamos crescer juntos?</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Mais visibilidade. Mais resultados. Mais oportunidades para o seu negócio.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/parceiro">
                Quero ser parceiro <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <footer className="mt-16 border-t border-border">
        <div className="flex items-center justify-between py-6">
          <BrandLogo className="h-9 w-auto" />
          <p className="text-xs text-muted-foreground">telahub.app</p>
        </div>
        </footer>
      </section>
    </main>
  );
}
