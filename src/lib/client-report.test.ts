import { describe, expect, test } from "bun:test";
import { previousMonthRange, summarize } from "./client-report";

describe("client report", () => {
  test("covers the whole previous month in São Paulo time", () => {
    const r = previousMonthRange(new Date("2026-12-01T11:00:00Z"));
    expect(r.start).toBe("2026-11-01T03:00:00.000Z");
    expect(r.end).toBe("2026-12-01T03:00:00.000Z");
  });

  test("January report covers December of the previous year", () => {
    const r = previousMonthRange(new Date("2027-01-01T11:00:00Z"));
    expect(r.start).toBe("2026-12-01T03:00:00.000Z");
  });

  test("minutes = exhibitions x ad duration", () => {
    const s = summarize(
      [{ screen_id: "a" }, { screen_id: "a" }, { screen_id: "b" }],
      20,
      new Map([["a", { name: "Academia", location: null }]]),
    );
    expect(s.total).toBe(3);
    expect(s.minutes).toBe(1);
    expect(s.rows[0]).toEqual({ name: "Academia", location: null, count: 2 });
  });
});
