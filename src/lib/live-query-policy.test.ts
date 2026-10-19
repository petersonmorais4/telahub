import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver, onlineManager } from "@tanstack/react-query";
import { liveQueryPolicy, liveRefetchInterval } from "./live-query-policy";

describe("TV live information recovery", () => {
  test("fetches weather even when the TV reports offline", async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    let requests = 0;
    const observer = new QueryObserver(client, {
      ...liveQueryPolicy,
      queryKey: ["weather", "Jundiaí"],
      queryFn: async () => {
        requests++;
        return { temperature: 20.1 };
      },
    });
    const unsubscribe = observer.subscribe(() => {});
    try {
      const result = await observer.refetch();
      assert.ok(requests > 0);
      assert.equal(result.data?.temperature, 20.1);
      assert.equal(result.fetchStatus, "idle");
    } finally {
      unsubscribe();
      client.clear();
      onlineManager.setOnline(true);
    }
  });

  test("retries missing information promptly instead of waiting ten minutes", () => {
    assert.equal(liveRefetchInterval(false), 5_000);
    assert.equal(liveRefetchInterval(true), 600_000);
  });
});