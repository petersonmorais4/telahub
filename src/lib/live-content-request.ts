import type { LiveContent, WeatherContent } from "./live-content-source";

type LiveInput = { type: "weather"; city: string } | { type: "market" } | { type: "news" };

// Older Android WebViews do not implement AbortSignal.timeout.
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error("Informações temporariamente indisponíveis.");
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// The weather provider rejects requests from the hosting edge network, so the
// device queries it directly (it allows cross-origin requests, no key needed).
export async function fetchWeatherDirect(city: string): Promise<WeatherContent> {
  const geo = await fetchJson<{
    results?: Array<{ name: string; country?: string; latitude: number; longitude: number; timezone?: string }>;
  }>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`,
    { credentials: "omit" },
  );
  const place = geo.results?.[0];
  if (!place) throw new Error("Cidade não encontrada.");
  const forecast = await fetchJson<{
    current?: { time: string; temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number };
  }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=${encodeURIComponent(place.timezone || "auto")}`,
    { credentials: "omit" },
  );
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

function requestFromServer(data: LiveInput): Promise<LiveContent> {
  const params = new URLSearchParams({ type: data.type });
  if (data.type === "weather") params.set("city", data.city);
  return fetchJson<LiveContent>(`/api/public/live-content?${params}`, { credentials: "omit" });
}

export async function requestLiveContent(data: LiveInput): Promise<LiveContent> {
  if (data.type === "weather") {
    try {
      return await fetchWeatherDirect(data.city);
    } catch {
      return requestFromServer(data);
    }
  }
  return requestFromServer(data);
}
