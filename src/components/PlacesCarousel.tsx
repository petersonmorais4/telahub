import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Place = { img: string; alt: string };

export function PlacesCarousel({ places }: { places: readonly Place[] }) {
  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fading, setFading] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tick, setTick] = useState(0);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const transition = (next: number) => {
    if (fadeRef.current) clearTimeout(fadeRef.current);
    if (reducedMotion) {
      setPosition(next);
      setFading(false);
      return;
    }
    setFading(true);
    fadeRef.current = setTimeout(() => {
      setPosition(next);
      setFading(false);
    }, 400);
  };

  useEffect(() => {
    if (paused || reducedMotion || places.length <= 3) return;
    const timer = setTimeout(() => {
      setFading(true);
      fadeRef.current = setTimeout(() => {
        setPosition((current) => (current + 1) % places.length);
        setFading(false);
      }, 400);
    }, 4000);
    return () => clearTimeout(timer);
  }, [paused, reducedMotion, position, tick, places.length]);

  useEffect(() => () => {
    if (fadeRef.current) clearTimeout(fadeRef.current);
  }, []);

  if (places.length === 0) return null;
  const visible = Array.from({ length: Math.min(3, places.length) }, (_, index) =>
    places[(position + index) % places.length],
  );

  return (
    <div
      className="mt-10"
      role="region"
      aria-label="Fotos dos pontos TelaHUB"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 transition-opacity duration-400 motion-reduce:transition-none ${fading ? "opacity-0" : "opacity-100"}`}>
        {visible.map((place, index) => place && (
          <div key={place.img} className={`group overflow-hidden rounded-xl border border-border bg-card ${index > 0 ? "hidden sm:block" : ""}`}>
            <img src={place.img} alt={place.alt} className="aspect-[9/19] w-full object-cover object-bottom transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.03]" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-1">
        {places.map((place, index) => (
          <Button key={place.img} type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ver foto ${index + 1}`} aria-current={index === position ? "true" : undefined} onClick={() => {
            if (index === position) return;
            setTick((current) => current + 1);
            transition(index);
          }}>
            <span aria-hidden="true" className={`h-2 rounded-full transition-all ${index === position ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"}`} />
          </Button>
        ))}
      </div>
    </div>
  );
}