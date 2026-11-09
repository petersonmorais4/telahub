import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyBusinessHours, isWithinBusinessHours, businessHoursSchema } from "./business-hours";

const hours = emptyBusinessHours();
hours[1] = [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }];
test("reports include opening time and exclude closing time in Brasília", () => {
  assert.equal(isWithinBusinessHours(hours, "2026-11-09T11:59:00Z"), false);
  assert.equal(isWithinBusinessHours(hours, "2026-11-09T12:00:00Z"), true);
  assert.equal(isWithinBusinessHours(hours, "2026-11-09T21:00:00Z"), false);
});
test("the break is excluded but the second opening interval is included", () => {
  assert.equal(isWithinBusinessHours(hours, "2026-11-09T16:00:00Z"), false);
  assert.equal(isWithinBusinessHours(hours, "2026-11-09T17:00:00Z"), true);
});
test("closed days are excluded from reports and the 9am reminder", () => {
  assert.equal(isWithinBusinessHours(hours, "2026-11-08T12:00:00Z"), false);
  assert.equal(isWithinBusinessHours(hours, "2026-11-09T12:00:00Z"), true);
});
test("overnight intervals continue into the next day, but end at closing", () => {
  const overnight = emptyBusinessHours();
  overnight[6] = [{ start: "22:00", end: "02:00" }];
  assert.equal(isWithinBusinessHours(overnight, "2026-11-08T02:00:00Z"), true);
  assert.equal(isWithinBusinessHours(overnight, "2026-11-08T04:00:00Z"), true);
  assert.equal(isWithinBusinessHours(overnight, "2026-11-08T05:00:00Z"), false);
});
test("unconfigured points preserve legacy behaviour; malformed hours are rejected", () => {
  assert.equal(isWithinBusinessHours(null, "2026-11-09T12:00:00Z"), true);
  assert.equal(isWithinBusinessHours([], "2026-11-09T12:00:00Z"), false);
  const invalid = emptyBusinessHours(); invalid[1] = [{ start: "09:00", end: "09:00" }];
  assert.equal(businessHoursSchema.safeParse(invalid).success, false);
});