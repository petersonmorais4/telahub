import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const liveContentInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("weather"), city: z.string().trim().min(2).max(80) }),
  z.object({ type: z.literal("market") }),
]);

export interface WeatherContent {
  type: "weather";
  city: string;
  country: string;
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  weatherCode: number;
  observedAt: string;
}

export interface MarketContent {
  type: "market";
  symbol: "IBOV";
  name: "Ibovespa";
  value: number;
  change: number;
  changePercent: number;
  currency: "BRL";
  observedAt: string;
  delayed: true;
}

export type LiveContent = WeatherContent | MarketContent;

interface GeocodingResponse {
  results?: Array<{
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }>;
}

interface ForecastResponse {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
      };
    }>;
  };
}

export const getLiveContent = createServerFn({ method: "GET" })
  .inputValidator((input) => liveContentInput.parse(input))
  .handler(async ({ data }): Promise<LiveContent> => {
    if (data.type === "weather") {
      const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geoUrl.search = new URLSearchParams({
        name: data.city,
        count: "1",
        language: "pt",
        format: "json",
      }).toString();
      const geoResponse = await fetch(geoUrl, { headers: { Accept: "application/json" } });
      if (!geoResponse.ok) throw new Error("Não foi possível localizar a cidade.");
      const geo = (await geoResponse.json()) as GeocodingResponse;
      const place = geo.results?.[0];
      if (!place) throw new Error("Cidade não encontrada.");

      const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
      forecastUrl.search = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
        timezone: place.timezone || "auto",
      }).toString();
      const forecastResponse = await fetch(forecastUrl, { headers: { Accept: "application/json" } });
      if (!forecastResponse.ok) throw new Error("O clima está temporariamente indisponível.");
      const forecast = (await forecastResponse.json()) as ForecastResponse;
      const current = forecast.current;
      if (!current) throw new Error("O clima está temporariamente indisponível.");

      return {
        type: "weather",
        city: place.name,
        country: place.country ?? "Brasil",
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        observedAt: current.time,
      };
    }

    const marketResponse = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=5d&interval=1d",
      { headers: { Accept: "application/json", "User-Agent": "TelaHUB/1.0" } },
    );
    if (!marketResponse.ok) throw new Error("A cotação está temporariamente indisponível.");
    const chart = (await marketResponse.json()) as YahooChartResponse;
    const meta = chart.chart?.result?.[0]?.meta;
    const value = meta?.regularMarketPrice;
    const previous = meta?.chartPreviousClose ?? meta?.previousClose;
    if (typeof value !== "number" || typeof previous !== "number") {
      throw new Error("A cotação está temporariamente indisponível.");
    }
    const change = value - previous;

    return {
      type: "market",
      symbol: "IBOV",
      name: "Ibovespa",
      value,
      change,
      changePercent: previous === 0 ? 0 : (change / previous) * 100,
      currency: "BRL",
      observedAt: new Date((meta?.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
      delayed: true,
    };
  });