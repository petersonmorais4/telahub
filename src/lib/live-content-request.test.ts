import { test } from "node:test";
import assert from "node:assert/strict";
import { requestLiveContent } from "./live-content-request";

test("weather uses the public read-only endpoint without requiring an admin session", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "/api/public/live-content?type=weather&city=Jundia%C3%AD");
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.method ?? "GET", "GET");
    return Response.json({ type: "weather", city: "Jundiaí", temperature: 20 });
  };
  try {
    const result = await requestLiveContent({ type: "weather", city: "Jundiaí" });
    assert.equal(result.type, "weather");
    if (result.type === "weather") assert.equal(result.temperature, 20);
  } finally {
    globalThis.fetch = original;
  }
});