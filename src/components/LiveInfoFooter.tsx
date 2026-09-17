import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CloudSun, TrendingDown, TrendingUp } from "lucide-react";

import {
  getLiveContent,
  type LiveContent,
  type MarketContent,
  type WeatherContent,
} from "@/lib/live-content.functions";
import { cn } from "@/lib/utils";

function weatherLabel(code: number) {
  if (code === 0) return "Céu limpo";
  if (code <= 3) return "Parcialmente nublado";
  if (code === 45 || code === 48) return "Neblina";
  if (code <= 57) return "Garoa";
  if (code <= 67) return "Chuva";
  if (code <= 82) return "Pancadas de chuva";
  return "Trovoadas";
}

function isWeatherContent(data: LiveContent | undefined): data is WeatherContent {
  return data?.type === "weather";
}

function isMarketContent(data: LiveContent | undefined): data is MarketContent {
  return data?.type === "market";
}

export function LiveInfoFooter() {
  const fetchLiveContent = useServerFn(getLiveContent);
  const weather = useQuery({
    queryKey: ["live-footer", "weather", "São Paulo"],
    queryFn: () => fetchLiveContent({ data: { type: "weather", city: "São Paulo" } }),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 2,
  });
  const market = useQuery({
    queryKey: ["live-footer", "market"],
    queryFn: () => fetchLiveContent({ data: { type: "market" } }),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 2,
  });

  const weatherData = isWeatherContent(weather.data) ? weather.data : null;
  const marketData = isMarketContent(market.data) ? market.data : null;
  const positive = (marketData?.change ?? 0) >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-background px-4 text-foreground shadow-panel md:h-20 md:px-8">
      <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 md:gap-10">
        <div className="flex min-w-0 items-center gap-3 md:gap-4" aria-live="polite">
          <CloudSun className="h-7 w-7 shrink-0 text-primary md:h-9 md:w-9" aria-hidden />
          {weatherData ? (
            <div className="flex min-w-0 items-baseline gap-2 md:gap-4">
              <span className="font-display text-2xl font-bold tabular-nums md:text-4xl">
                {Math.round(weatherData.temperature)}°
              </span>
              <span className="truncate text-sm md:text-xl">São Paulo</span>
              <span className="hidden text-muted-foreground lg:inline">
                {weatherLabel(weatherData.weatherCode)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground md:text-lg">Atualizando clima…</span>
          )}
        </div>

        <div className="h-8 w-px shrink-0 bg-border md:h-10" aria-hidden />

        <div className="flex min-w-0 items-center justify-end gap-3 md:gap-4" aria-live="polite">
          <TrendIcon
            className={cn("h-7 w-7 shrink-0 md:h-9 md:w-9", positive ? "text-primary" : "text-destructive")}
            aria-hidden
          />
          {marketData ? (
            <div className="flex min-w-0 items-baseline gap-2 md:gap-4">
              <span className="text-sm font-semibold md:text-xl">IBOV</span>
              <span className="font-display text-xl font-bold tabular-nums md:text-3xl">
                {marketData.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </span>
              <span className={cn("text-sm font-semibold tabular-nums md:text-xl", positive ? "text-primary" : "text-destructive")}>
                {positive ? "+" : ""}
                {marketData.changePercent.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%
              </span>
              <span className="hidden text-xs text-muted-foreground xl:inline">possível atraso</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground md:text-lg">Atualizando Ibovespa…</span>
          )}
        </div>
      </div>
    </footer>
  );
}