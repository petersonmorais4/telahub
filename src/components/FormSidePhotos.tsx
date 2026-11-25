import { useEffect, useState } from "react";
import nutrifit from "@/assets/locais/nutrifit-lounge-jundiai.jpg.asset.json";
import fazendinha from "@/assets/locais/fazendinha-do-leo-jose-valter.jpg.asset.json";

const photos = [
  { src: nutrifit.url, name: "Nutrifit Lounge", address: "Av. Nove de Julho, 3600 · Jundiaí" },
  { src: fazendinha.url, name: "Fazendinha do Léo", address: "Rua José Valter Pacheco, 761 · Campo Limpo Paulista" },
] as const;

export function FormSidePhotos({ className = "", full = false }: { className?: string; full?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % photos.length), 4000);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className={`relative overflow-hidden bg-muted ${full ? "" : "rounded-xl border border-border"} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={`relative w-full ${full ? "h-[70vh] lg:h-[calc(100vh-81px)]" : "aspect-[3/4]"}`}>
        {photos.map((p, i) => (
          <img
            key={p.name}
            src={p.src}
            alt={`TV TelaHUB no ${p.name}`}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-6 pt-16">
          <p className="font-semibold text-foreground">{photos[index]?.name}</p>
          <p className="text-sm text-muted-foreground">{photos[index]?.address}</p>
          <div className="mt-3 flex gap-2">
            {photos.map((p, i) => (
              <button
                key={p.name}
                type="button"
                aria-label={`Mostrar foto ${p.name}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2 bg-foreground/40"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
