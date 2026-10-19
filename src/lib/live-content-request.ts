import type { LiveContent } from "./live-content-source";

type LiveInput = { type: "weather"; city: string } | { type: "market" };

export async function requestLiveContent(data: LiveInput): Promise<LiveContent> {
  const params = new URLSearchParams({ type: data.type });
  if (data.type === "weather") params.set("city", data.city);
  // Older Android WebViews do not implement AbortSignal.timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`/api/public/live-content?${params}`, {
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Informações temporariamente indisponíveis.");
    return await response.json() as LiveContent;
  } finally {
    clearTimeout(timeout);
  }
}