/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
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
      expect(requests).toBeGreaterThan(0);
      expect(result.data?.temperature).toBe(20.1);
      expect(result.fetchStatus).toBe("idle");
    } finally {
      unsubscribe();
      client.clear();
      onlineManager.setOnline(true);
    }
  });

  test("retries missing information promptly instead of waiting ten minutes", () => {
    expect(liveRefetchInterval(false)).toBe(5_000);
    expect(liveRefetchInterval(true)).toBe(600_000);
  });
});