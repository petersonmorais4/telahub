import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

const NetworkMap = lazy(() => import("@/components/NetworkMap").then((m) => ({ default: m.NetworkMap })));
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Eye,
  MapPin,
  Newspaper,
  QrCode,
  RefreshCw,
} from "lucide-react";

import localStudioSA from "@/assets/locais/studio-sa-campo-limpo.jpg.asset.json";
import localBarbearia from "@/assets/locais/evandro-barbearia.jpg.asset.json";
import localStudioJundiai from "@/assets/locais/studio-sa-jundiai.jpg.asset.json";
import localPilates from "@/assets/locais/pilates-jundiai.jpg.asset.json";
import localNoveJulho from "@/assets/locais/av-nove-de-julho-jundiai.jpg.asset.json";
import localBragantina from "@/assets/locais/estrada-bragantina-campo-limpo.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { WhatsAppButton } from "@/components/WhatsAppButton";

const WHATS = "https://wa.me/5511964424040";

export const Route = createFileRoute("/anuncie")({
  head: () => ({
    meta: [
      { title: "Anuncie na TelaHUB — Sua marca nas telas do seu bairro" },
      {
        name: "description",
        content:
          "Anuncie em telas digitais em academias, mercados, farmácias e barbearias. Público local, anúncio que não se pula e relatório de exibição.",
      },
      { property: "og:title", content: "Anuncie na TelaHUB — Sua marca nas telas do seu bairro" },
      {
        property: "og:description",
        content: "Telas digitais em locais de alta circulação, com público real da sua região.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Anuncie,
});

const stats = [
  { value: "R$ 3,12 bi", text: "investidos em mídia exterior (OOH) no Brasil em 2024", source: "Painel Cenp 2024" },
  { value: "+22,7%", text: "de crescimento no investimento em OOH em 2024", source: "Painel Cenp 2024" },
  { value: "71%", text: "dos profissionais de marketing pretendem aumentar o investimento em DOOH", source: "Panorama DOOH 2025" },
];

const reasons = [
  { icon: Eye, title: "Não dá para pular", text: "Sem botão de pular, sem bloqueador de anúncio. Sua marca aparece de verdade." },
  { icon: MapPin, title: "Público do seu bairro", text: "Quem vê a tela mora, treina e compra perto de você." },
  { icon: Newspaper, title: "Tela que prende o olhar", text: "Notícias do g1, clima e Ibovespa intercalados com os anúncios." },
  { icon: QrCode, title: "Do olhar ao contato", text: "Seu anúncio pode levar um QR Code direto para o seu WhatsApp." },
  { icon: RefreshCw, title: "Troca rápida", text: "Mudou a promoção? Atualizamos o anúncio sem custo de gráfica." },
  { icon: BarChart3, title: "Relatório de exibição", text: "Você recebe dia e horário em que seu anúncio passou." },
];

const places = [
  { alt: "Tela TelaHUB no Studio S&A, Campo Limpo Paulista", img: localStudioSA.url },
  { alt: "Tela TelaHUB na Evandro Barbearia, Campo Limpo Paulista", img: localBarbearia.url },
  { alt: "Tela TelaHUB no Ed. Jatobá, Jundiaí", img: localStudioJundiai.url },
  { alt: "Tela TelaHUB em estúdio de pilates, Jundiaí", img: localPilates.url },
  { alt: "Tela TelaHUB na Av. Nove de Julho, Jundiaí", img: localNoveJulho.url },
  { alt: "Tela TelaHUB na Estrada da Bragantina, Campo Limpo Paulista", img: localBragantina.url },
];

const steps = [
  { title: "Fale com a gente", text: "Conte seu objetivo e região." },
  { title: "Escolha as telas", text: "Uma tela ou a rede inteira." },
  { title: "Envie sua arte", text: "Imagem ou vídeo — ajudamos a montar." },
  { title: "No ar", text: "Seu anúncio começa a rodar e você acompanha." },
];

const compare = [
  { label: "Panfleto", items: ["Vai para o lixo", "Custo de impressão", "Sem acompanhamento"] },
  { label: "Redes sociais", items: ["Pulado em segundos", "Disputa com milhares de posts", "Público disperso"] },
  { label: "TelaHUB", items: ["Exibição contínua o dia todo", "Público local e presente", "Relatório de exibição"], highlight: true },
];

const slideIds = ["abertura", "mercado", "por-que", "locais", "mapa", "comparativo", "como-anunciar", "contato"];

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

const section = "mx-auto w-full max-w-6xl px-6 py-20 snap-start min-h-screen flex flex-col justify-center";

function Anuncie() {
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
        to="/anunciar"
        className="fixed right-0 top-1/2 z-50 hidden -translate-y-1/2 items-center gap-2 rounded-l-xl bg-primary px-3.5 py-6 font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-[var(--shadow-lift)] transition-all duration-300 hover:px-5 hover:brightness-110 sm:flex"
        style={{ writingMode: "vertical-rl" }}
      >
        Quero anunciar
      </Link>
      <div className="fixed bottom-5 left-6 z-50 font-display text-sm text-muted-foreground">
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
          style={{ background: "radial-gradient(60% 60% at 80% 20%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 70%)" }}
          aria-hidden
        />
        <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-6">
          <Link to="/" aria-label="Página inicial"><BrandLogo className="h-16 w-auto sm:h-28" /></Link>
        </header>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Para quem quer vender mais</p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] sm:text-6xl">
              Seu anúncio na tela{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">que todo mundo vê.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Telas digitais em academias, mercados, farmácias e barbearias do seu bairro. Simples de contratar, fácil de acompanhar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/anunciar">Quero anunciar <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href={WHATS} target="_blank" rel="noreferrer">Falar no WhatsApp</a>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/20 blur-3xl" aria-hidden />
            <img src={localBarbearia.url} alt="Tela TelaHUB exibindo anúncio na Evandro Barbearia" className="aspect-[4/3] w-full rounded-2xl border border-border object-cover object-[center_30%] shadow-[var(--shadow-lift)]" />
          </div>
        </div>
      </section>

      {/* Mercado */}
      <section id="mercado" className="border-y border-border bg-card/50 snap-start min-h-screen flex flex-col justify-center">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">
            As grandes marcas já investem <span className="text-primary">em telas fora de casa.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">Agora o seu negócio também pode — com preço de mídia local.</p>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            {stats.map((s, i) => (
              <Reveal key={s.value} delay={i * 150} className="bg-background p-8 hover:bg-card">
                <p className="font-display text-5xl font-bold text-primary">{s.value}</p>
                <p className="mt-4 text-foreground">{s.text}</p>
                <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Fonte: {s.source}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Por que */}
      <section id="por-que" className={section}>
        <h2 className="text-3xl font-bold sm:text-4xl">Por que anunciar <span className="text-primary">na TelaHUB?</span></h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((b, i) => (
            <Reveal key={b.title} delay={i * 100} className="panel h-full p-6 hover:-translate-y-1 hover:border-primary/60">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Locais */}
      <section id="locais" className={section}>
        <h2 className="text-3xl font-bold sm:text-4xl">Onde seu anúncio aparece</h2>
        <p className="mt-3 text-muted-foreground">Lugares onde as pessoas param, esperam e olham para a tela.</p>
        <div className="mt-10 grid gap-4 grid-cols-2 lg:grid-cols-3">
          {places.map((p, i) => (
            <Reveal key={p.img} delay={i * 120} className="group overflow-hidden rounded-xl border border-border bg-card">
              <img src={p.img} alt={p.alt} className="aspect-[9/19] w-full object-cover object-bottom transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Mapa */}
      <section id="mapa" className={section}>
        <h2 className="text-3xl font-bold sm:text-4xl">Onde estamos</h2>
        <p className="mt-3 text-muted-foreground">Pontos da rede TelaHub onde sua marca pode aparecer.</p>
        <div className="mt-8">
          <ClientOnly fallback={<div className="h-[420px] rounded-xl border border-border bg-card" />}>
            <Suspense fallback={<div className="h-[420px] rounded-xl border border-border bg-card" />}>
              <NetworkMap />
            </Suspense>
          </ClientOnly>
        </div>
      </section>

      {/* Comparativo */}
      <section id="comparativo" className={section}>
        <h2 className="text-3xl font-bold sm:text-4xl">Compare e <span className="text-primary">decida.</span></h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {compare.map((c, i) => (
            <Reveal key={c.label} delay={i * 150} className={`h-full rounded-xl border p-6 ${c.highlight ? "border-primary bg-primary/10 shadow-[var(--shadow-lift)]" : "border-border bg-card"}`}>
              <h3 className={`font-display text-xl font-bold ${c.highlight ? "text-primary" : ""}`}>{c.label}</h3>
              <ul className="mt-4 space-y-3">
                {c.items.map((it) => (
                  <li key={it} className={c.highlight ? "text-foreground" : "text-muted-foreground"}>
                    {c.highlight ? "✓ " : "– "}{it}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Como anunciar */}
      <section id="como-anunciar" className={section}>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Como anunciar</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Em 4 passos, sua marca no ar.</h2>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title}><Reveal delay={i * 120} className="panel h-full p-6 hover:-translate-y-1 hover:border-primary/60">
              <span className="font-display text-4xl font-bold text-primary/40">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-4 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </Reveal></li>
          ))}
        </ol>
      </section>

      {/* Contato */}
      <section id="contato" className={section}>
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-10 text-center sm:p-16">
          <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(50% 80% at 50% 100%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)" }} aria-hidden />
          <div className="relative">
            <h2 className="text-3xl font-bold sm:text-5xl">Bora colocar sua marca na tela?</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Planos flexíveis: de uma tela até a rede inteira. Fale com a gente e receba uma proposta.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg"><Link to="/anunciar">Quero anunciar <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><a href={WHATS} target="_blank" rel="noreferrer">Chamar no WhatsApp</a></Button>
            </div>
          </div>
        </div>
        <footer className="mt-16 border-t border-border">
          <div className="flex items-center justify-between py-6">
            <BrandLogo className="h-9 w-auto" />
            <p className="text-xs text-muted-foreground">telahub.app</p>
          </div>
        </footer>
      </section>
      <WhatsAppButton />
    </main>
  );
}
