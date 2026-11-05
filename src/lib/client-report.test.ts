import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { previousMonthRange, previousWeekRange, summarize } from "./client-report";

describe("client report", () => {
  test("covers the whole previous month in São Paulo time", () => {
    const r = previousMonthRange(new Date("2026-12-01T11:00:00Z"));
    assert.equal(r.start, "2026-11-01T03:00:00.000Z");
    assert.equal(r.end, "2026-12-01T03:00:00.000Z");
  });

  test("January report covers December of the previous year", () => {
    const r = previousMonthRange(new Date("2027-01-01T11:00:00Z"));
    assert.equal(r.start, "2026-12-01T03:00:00.000Z");
  });

  test("weekly report covers last Monday to Sunday", () => {
    const r = previousWeekRange(new Date("2026-11-09T11:00:00Z")); // Monday 08h SP
    assert.equal(r.start, "2026-11-02T03:00:00.000Z");
    assert.equal(r.end, "2026-11-09T03:00:00.000Z");
    assert.equal(r.label, "02/11 a 08/11");
  });

  test("minutes = exhibitions x ad duration", () => {
    const s = summarize(
      [{ screen_id: "a" }, { screen_id: "a" }, { screen_id: "b" }],
      20,
      new Map([["a", { name: "Academia", location: null }]]),
    );
    assert.equal(s.total, 3);
    assert.equal(s.minutes, 1);
    assert.deepEqual(s.rows[0], { name: "Academia", location: null, count: 2 });
  });
});
