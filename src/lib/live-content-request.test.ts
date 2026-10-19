import { test } from "node:test";
import assert from "node:assert/strict";
import { requestLiveContent } from "./live-content-request";

test("weather is fetched directly from the device first", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("geocoding-api")) {
      return Response.json({ results: [{ name: "Jundiaí", country: "Brasil", latitude: -23.18, longitude: -46.88 }] });
    }
    return Response.json({ current: { time: "t", temperature_2m: 20, apparent_temperature: 20, weather_code: 0, wind_speed_10m: 1 } });
  };
  try {
    const result = await requestLiveContent({ type: "weather", city: "Jundiaí" });
    assert.equal(result.type, "weather");
    if (result.type === "weather") assert.equal(result.temperature, 20);
    assert.ok(!calls.some((c) => c.startsWith("/api/")));
  } finally {
    globalThis.fetch = original;
  }
});

test("weather falls back to the public endpoint when the direct call fails", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes("open-meteo")) return new Response("", { status: 429 });
    assert.equal(u, "/api/public/live-content?type=weather&city=Jundia%C3%AD");
    assert.equal(init?.credentials, "omit");
    return Response.json({ type: "weather", city: "Jundiaí", temperature: 18 });
  };
  try {
    const result = await requestLiveContent({ type: "weather", city: "Jundiaí" });
    if (result.type === "weather") assert.equal(result.temperature, 18);
  } finally {
    globalThis.fetch = original;
  }
});
