import { useQuery } from "@tanstack/react-query";
import { CloudSun, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import qrcodeAsset from "@/assets/qrcode-telahub.png.asset.json";
import { BrandLogo } from "@/components/BrandLogo";
import {
  type LiveContent,
  type MarketContent,
  type WeatherContent,
} from "@/lib/live-content.functions";
import { cn } from "@/lib/utils";
import { liveQueryPolicy, liveRefetchInterval } from "@/lib/live-query-policy";
import { requestLiveContent } from "@/lib/live-content-request";

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

export function LiveInfoFooter({ city }: { city: string | null }) {
  const [visibleInfo, setVisibleInfo] = useState<"weather" | "market">("weather");
  const selectedCity = city?.trim() || null;
  const weather = useQuery({
    ...liveQueryPolicy,
    queryKey: ["live-footer", "weather", selectedCity],
    queryFn: () => {
      if (!selectedCity) throw new Error("Cidade ainda não carregada.");
      return requestLiveContent({ type: "weather", city: selectedCity });
    },
    enabled: Boolean(selectedCity),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60_000,
    refetchInterval: (query) => liveRefetchInterval(Boolean(query.state.data)),
  });
  const market = useQuery({
    ...liveQueryPolicy,
    queryKey: ["live-footer", "market"],
    queryFn: () => requestLiveContent({ type: "market" }),
    staleTime: 5 * 60_000,
    refetchInterval: (query) => liveRefetchInterval(Boolean(query.state.data)),
  });

  const weatherData = isWeatherContent(weather.data) ? weather.data : null;
  const marketData = isMarketContent(market.data) ? market.data : null;
  const positive = (marketData?.change ?? 0) >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  const weatherUnavailable = weather.isError && !weatherData;
  const marketUnavailable = market.isError && !marketData;
  const hasWeather = Boolean(weatherData);
  const hasMarket = Boolean(marketData);

  useEffect(() => {
    if (hasWeather && !hasMarket) {
      setVisibleInfo("weather");
      return;
    }
    if (hasMarket && !hasWeather) {
      setVisibleInfo("market");
      return;
    }
    if (!hasWeather || !hasMarket) return;

    const id = window.setInterval(() => {
      setVisibleInfo((current) => (current === "weather" ? "market" : "weather"));
    }, 8_000);
    return () => window.clearInterval(id);
  }, [hasMarket, hasWeather]);

  const showWeather = visibleInfo === "weather" && !weatherUnavailable;
  const allUnavailable = weatherUnavailable && marketUnavailable;

  return (
    <footer className="absolute inset-x-0 bottom-0 z-30 flex h-11 items-center border-t border-border bg-background px-3 text-foreground shadow-panel md:h-14 md:px-6">
      <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 self-stretch">
        <div className="relative flex shrink-0 items-center gap-2 self-stretch md:gap-3">
          <img
            src={qrcodeAsset.url}
            alt="QR Code TelaHUB"
            className="absolute bottom-0 left-0 z-10 h-20 w-20 rounded-2xl bg-white object-contain p-1.5 shadow-lg md:h-24 md:w-24"
          />
          <div className="w-20 shrink-0 md:w-24" aria-hidden />
          <span className="hidden shrink-0 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:inline md:text-sm">
            Anuncie com a
          </span>
          <BrandLogo className="h-7 w-auto shrink-0 md:h-9" />
        </div>

        <div className="min-w-0 overflow-hidden" aria-live="polite">
          {allUnavailable ? (
            <span className="text-xs text-muted-foreground md:text-sm">Informações temporariamente indisponíveis</span>
          ) : showWeather ? (
            <div key="weather" className="live-info-enter flex min-w-0 items-center justify-end gap-2 md:gap-3">
              <CloudSun className="h-4 w-4 shrink-0 text-primary md:h-5 md:w-5" aria-hidden />
              {weatherData ? (
                <div className="flex min-w-0 items-baseline gap-2 text-xs md:text-base">
                  <span className="font-display font-bold tabular-nums md:text-lg">
                    {Math.round(weatherData.temperature)}°
                  </span>
                  <span className="truncate">{weatherData.city}</span>
                  <span className="hidden text-muted-foreground sm:inline">
                    {weatherLabel(weatherData.weatherCode)}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground md:text-sm">Atualizando clima…</span>
              )}
            </div>
          ) : (
            <div key="market" className="live-info-enter flex min-w-0 items-center justify-end gap-2 md:gap-3">
              <TrendIcon
                className={cn("h-4 w-4 shrink-0 md:h-5 md:w-5", positive ? "text-primary" : "text-destructive")}
                aria-hidden
              />
              {marketData ? (
                <div className="flex min-w-0 items-baseline gap-2 text-xs md:text-base">
                  <span className="font-semibold">IBOV</span>
                  <span className="font-display font-bold tabular-nums md:text-lg">
                    {marketData.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </span>
                  <span className={cn("font-semibold tabular-nums", positive ? "text-primary" : "text-destructive")}>
                    {positive ? "+" : ""}
                    {marketData.changePercent.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}%
                  </span>
                  <span className="hidden text-[0.65rem] text-muted-foreground lg:inline">possível atraso</span>
                </div>
              ) : marketUnavailable ? (
                <span className="text-xs text-muted-foreground md:text-sm">Ibovespa temporariamente indisponível</span>
              ) : (
                <span className="text-xs text-muted-foreground md:text-sm">Atualizando Ibovespa…</span>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}