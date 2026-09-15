import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CloudSun, TrendingDown, TrendingUp, Wind } from "lucide-react";

import { getLiveContent } from "@/lib/live-content.functions";
import type { MediaRow } from "@/lib/signage";
import { cn } from "@/lib/utils";

function configCity(media: Pick<MediaRow, "content_config">) {
  const config = media.content_config;
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const city = (config as Record<string, unknown>)["city"];
    if (typeof city === "string" && city.trim()) return city.trim();
  }
  return "São Paulo";
}

function weatherLabel(code: number) {
  if (code === 0) return "Céu limpo";
  if (code <= 3) return "Parcialmente nublado";
  if (code === 45 || code === 48) return "Neblina";
  if (code <= 57) return "Garoa";
  if (code <= 67) return "Chuva";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Pancadas de chuva";
  if (code <= 86) return "Pancadas de neve";
  return "Trovoadas";
}

export function DynamicMedia({
  media,
  compact = false,
  className,
}: {
  media: Pick<MediaRow, "type" | "title" | "content_config">;
  compact?: boolean;
  className?: string | undefined;
}) {
  const fetchLiveContent = useServerFn(getLiveContent);
  const isWeather = media.type === "weather";
  const city = configCity(media);
  const { data, isError } = useQuery({
    queryKey: ["live-content", media.type, city],
    queryFn: () => fetchLiveContent({ data: isWeather ? { type: "weather", city } : { type: "market" } }),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 2,
  });

  if (compact) {
    return (
      <div className={cn("flex items-center justify-center bg-secondary text-primary", className)}>
        {isWeather ? <CloudSun className="h-7 w-7" aria-hidden /> : <TrendingUp className="h-7 w-7" aria-hidden />}
      </div>
    );
  }

  if (!data || isError) {
    return (
      <div className={cn("flex h-full w-full flex-col items-center justify-center gap-5 bg-background text-foreground", className)}>
        {isWeather ? <CloudSun className="h-20 w-20 text-primary" aria-hidden /> : <TrendingUp className="h-20 w-20 text-primary" aria-hidden />}
        <p className="text-3xl font-semibold">{isError ? "Atualizando informações…" : "Carregando informações…"}</p>
      </div>
    );
  }

  if (data.type === "weather") {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-background px-[7vw] text-foreground", className)}>
        <div className="grid w-full max-w-6xl grid-cols-[auto_1fr] items-center gap-[6vw]">
          <CloudSun className="h-[25vw] max-h-80 w-[25vw] max-w-80 text-primary" strokeWidth={1.3} aria-hidden />
          <div>
            <p className="text-[clamp(1.5rem,3vw,3rem)] text-muted-foreground">Clima agora</p>
            <p className="mt-3 font-display text-[clamp(3rem,8vw,8rem)] font-bold leading-none">{Math.round(data.temperature)}°</p>
            <h2 className="mt-5 text-[clamp(2rem,4vw,4rem)] font-semibold">{data.city}</h2>
            <p className="mt-2 text-[clamp(1.25rem,2.5vw,2.5rem)] text-primary">{weatherLabel(data.weatherCode)}</p>
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-[clamp(1rem,2vw,2rem)] text-muted-foreground">
              <span>Sensação {Math.round(data.apparentTemperature)}°</span>
              <span className="inline-flex items-center gap-2"><Wind className="h-[1em] w-[1em]" /> {Math.round(data.windSpeed)} km/h</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const positive = data.change >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-background px-[8vw] text-foreground", className)}>
      <div className="w-full max-w-6xl">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendIcon className="h-11 w-11" aria-hidden />
          </div>
          <div><p className="text-2xl text-muted-foreground">Mercado brasileiro</p><h2 className="text-5xl font-semibold">Ibovespa <span className="text-muted-foreground">IBOV</span></h2></div>
        </div>
        <p className="mt-14 font-display text-[clamp(4rem,10vw,10rem)] font-bold leading-none tabular-nums">{data.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
        <div className={cn("mt-8 flex items-center gap-4 text-[clamp(2rem,4vw,4rem)] font-semibold", positive ? "text-primary" : "text-destructive")}>
          <TrendIcon className="h-[1em] w-[1em]" />
          <span>{positive ? "+" : ""}{data.changePercent.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
          <span className="text-[0.55em] font-normal text-muted-foreground">dados com possível atraso</span>
        </div>
      </div>
    </div>
  );
}