import type { LiveContent } from "./live-content-source";

type LiveInput = { type: "weather"; city: string } | { type: "market" };

export async function requestLiveContent(data: LiveInput): Promise<LiveContent> {
  const params = new URLSearchParams({ type: data.type });
  if (data.type === "weather") params.set("city", data.city);
  const response = await fetch(`/api/public/live-content?${params}`, {
    credentials: "omit",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("Informações temporariamente indisponíveis.");
  return response.json() as Promise<LiveContent>;
}