import { z } from "zod";

export const liveContentInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("weather"), city: z.string().trim().min(2).max(80) }),
  z.object({ type: z.literal("market") }),
  z.object({ type: z.literal("news") }),
]);

export interface NewsItem {
  title: string;
  summary: string;
  image: string | null;
  publishedAt: string | null;
}

export interface NewsContent {
  type: "news";
  source: "g1";
  items: NewsItem[];
  observedAt: string;
}

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

export type LiveContent = WeatherContent | MarketContent | NewsContent;

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

function decodeEntities(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .trim();
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return match?.[1] ? decodeEntities(match[1]) : "";
}

// Parses the public G1 RSS feed with plain string matching (no DOM on the edge runtime).
export function parseG1Rss(xml: string, limit = 12): NewsItem[] {
  const items: NewsItem[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1] ?? "";
    const title = tag(block, "title");
    if (!title) continue;
    const media = block.match(/<media:content[^>]*url="([^"]+)"/)?.[1];
    const img = block.match(/<img[^>]*src="([^"]+)"/)?.[1];
    const image = media ?? img ?? null;
    const summary = tag(block, "atom:subtitle");
    const pub = tag(block, "pubDate");
    items.push({
      title,
      summary: summary.length > 220 ? `${summary.slice(0, 217)}…` : summary,
      image: image && image.startsWith("https://") ? image : null,
      publishedAt: pub ? new Date(pub).toISOString() : null,
    });
    if (items.length >= limit) break;
  }
  return items;
}

export async function loadLiveContent(data: z.infer<typeof liveContentInput>): Promise<LiveContent> {
    if (data.type === "news") {
      const response = await fetch("https://g1.globo.com/rss/g1/", {
        headers: { Accept: "application/rss+xml, application/xml", "User-Agent": "TelaHUB/1.0" },
      });
      if (!response.ok) throw new Error("As notícias estão temporariamente indisponíveis.");
      const items = parseG1Rss(await response.text());
      if (!items.length) throw new Error("As notícias estão temporariamente indisponíveis.");
      return { type: "news", source: "g1", items, observedAt: new Date().toISOString() };
    }
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
}