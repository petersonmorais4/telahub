import { test } from "node:test";
import assert from "node:assert/strict";
import { filterReportScreens } from "./report-screen-filter";
import { emptyBusinessHours } from "./business-hours";

const logs = [
  { screen_id: "studio", screens: { name: "Studio S&A" } },
  { screen_id: "pilates", screens: { name: "Pilates" } },
  { screen_id: "barbearia", screens: { name: "Barbearia" } },
  { screen_id: "teste", screens: { name: "Ponto Teste" } },
];

test("includes only the multiple points marked for the report", () => {
  assert.deepEqual(filterReportScreens(logs, ["studio", "pilates"]).map((log) => log.screen_id), ["studio", "pilates"]);
});
test("unchecking every point produces an empty report, not all points", () => {
  assert.deepEqual(filterReportScreens(logs, []), []);
});
test("all points never includes a point whose name contains Teste", () => {
  assert.deepEqual(filterReportScreens(logs, null).map((log) => log.screen_id), ["studio", "pilates", "barbearia"]);
  assert.deepEqual(filterReportScreens(logs, ["teste"]), []);
});
test("report totals and PDF rows only receive exhibitions during opening hours", () => {
  const hours = emptyBusinessHours();
  hours[1] = [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }];
  const rows = ["2026-11-09T12:00:00Z", "2026-11-09T16:00:00Z", "2026-11-09T17:00:00Z", "2026-11-09T21:00:00Z"].map((played_at) => ({
    screen_id: "studio", played_at, screens: { name: "Studio S&A", business_hours: hours },
  }));
  assert.deepEqual(filterReportScreens(rows, ["studio"]).map((row) => row.played_at), ["2026-11-09T12:00:00Z", "2026-11-09T17:00:00Z"]);
});