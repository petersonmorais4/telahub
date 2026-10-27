import { describe, expect, it } from "vitest";
import { billingReminders } from "./billing";

const row = (o: Partial<Parameters<typeof billingReminders>[0][number]>) => ({
  media_id: "m1", client_name: "Select", amount: 100, payment_date: "2026-10-01",
  recurrence_days: 30, recurring: true, ...o,
});

describe("billingReminders", () => {
  it("cobra 30 dias após o último pagamento", () => {
    const [r] = billingReminders([row({})], "2026-10-31");
    expect(r?.dueDate).toBe("2026-10-31");
    expect(r?.daysLeft).toBe(0);
  });
  it("não lembra quando faltam mais de 5 dias", () => {
    expect(billingReminders([row({})], "2026-10-20")).toHaveLength(0);
  });
  it("usa só o pagamento mais recente do anúncio", () => {
    const list = billingReminders([row({}), row({ payment_date: "2026-10-25" })], "2026-10-31");
    expect(list).toHaveLength(0);
  });
  it("ignora receitas avulsas", () => {
    expect(billingReminders([row({ recurring: false })], "2026-11-30")).toHaveLength(0);
  });
});
