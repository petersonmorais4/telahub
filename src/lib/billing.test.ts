import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { billingReminders, type RevenueLike } from "./billing";

const row = (o: Partial<RevenueLike>): RevenueLike => ({
  media_id: "m1", client_name: "Select", amount: 100, payment_date: "2026-10-01",
  recurrence_days: 30, recurring: true, ...o,
});

describe("billingReminders", () => {
  test("cobra 30 dias após o último pagamento", () => {
    const [r] = billingReminders([row({})], "2026-10-31");
    assert.equal(r?.dueDate, "2026-10-31");
    assert.equal(r?.daysLeft, 0);
  });
  test("não lembra quando faltam mais de 5 dias", () => {
    assert.equal(billingReminders([row({})], "2026-10-20").length, 0);
  });
  test("usa só o pagamento mais recente do anúncio", () => {
    assert.equal(billingReminders([row({}), row({ payment_date: "2026-10-25" })], "2026-10-31").length, 0);
  });
  test("ignora receitas avulsas", () => {
    assert.equal(billingReminders([row({ recurring: false })], "2026-11-30").length, 0);
  });
});
