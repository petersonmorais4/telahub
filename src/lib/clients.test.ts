import { describe, it, expect } from "vitest";
import { groupClients } from "./clients";
const m = (id: string, client_name: string, client_email: string | null = null) => ({ id, title: id, type: "image", active: true, start_date: null, end_date: null, client_name, client_email, send_report: true });
const r = (id: string, client_name: string, amount: number, payment_date: string, media_id: string | null = null) => ({ id, client_name, amount, payment_date, payment_method: "pix", recurring: true, recurrence_days: 30, media_id, description: null });
describe("groupClients", () => {
  it("merges ads and revenues of the same client ignoring case/accents", () => {
    const g = groupClients([m("a", "Luarts", "x@y.com"), m("b", "LUARTS ")], [r("1", "luarts", 100, "2026-10-01"), r("2", "Luarts", 50, "2026-11-01")]);
    expect(g).toHaveLength(1);
    expect(g[0]!.media).toHaveLength(2);
    expect(g[0]!.total).toBe(150);
    expect(g[0]!.nextDue).toBe("2026-12-01");
  });
});
