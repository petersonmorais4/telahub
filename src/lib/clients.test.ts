import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupClients } from "./clients";
const m = (id: string, client_name: string | null, client_email: string | null = null, title = id) => ({ id, title, type: "image", active: true, start_date: null, end_date: null, client_name, client_email, send_report: true });
const r = (id: string, client_name: string, amount: number, payment_date: string, media_id: string | null = null) => ({ id, client_name, amount, payment_date, payment_method: "pix", recurring: true, recurrence_days: 30, media_id, description: null });
describe("groupClients", () => {
  it("merges ads and revenues of the same client ignoring case/accents", () => {
    const g = groupClients([m("a", "Luarts", "x@y.com"), m("b", "LUARTS ")], [r("1", "luarts", 100, "2026-10-01"), r("2", "Luarts", 50, "2026-11-01")]);
    assert.equal(g.length, 1);
    assert.equal(g[0]!.total, 150);
    assert.equal(g[0]!.nextDue, "2026-12-01");
  });
  it("same e-mail is one client", () => {
    const g = groupClients([m("a", "Bruna Ramos", "b@x.com", "Belu Kids"), m("b", "Bruna", "B@x.com", "Felisberto")], []);
    assert.equal(g.length, 1);
    assert.equal(g[0]!.arts.length, 2);
  });
  it("revenue under company name joins the ad's client via media_id", () => {
    const g = groupClients([m("a", "Igor Mescole", "i@x.com", "Salus Design")], [r("1", "Salus Design", 200, "2026-11-01", "a")]);
    assert.equal(g.length, 1);
    assert.equal(g[0]!.total, 200);
  });
  it("vertical and horizontal versions without contact form one folder and one art", () => {
    const g = groupClients([m("a", null, null, "Optica SJ"), m("b", null, null, "Optica SJ Vertical")], []);
    assert.equal(g.length, 1);
    assert.equal(g[0]!.arts.length, 1);
    assert.equal(g[0]!.arts[0]!.versions.length, 2);
    assert.equal(g[0]!.hasContact, false);
  });
  it("numbered pieces of the same campaign form one folder", () => {
    const g = groupClients([m("a", null, null, "hamburgueria4.png"), m("b", null, null, "hamburgueria 3.png"), m("c", null, null, "hamburgueria 2.png")], []);
    assert.equal(g.length, 1);
    assert.equal(g[0]!.arts.length, 1);
    assert.equal(g[0]!.arts[0]!.versions.length, 3);
  });
  it("type: explicit wins, else pagante with revenue, else none", () => {
    const p = { ...m("a", "Ana", "a@x.com"), client_type: "parceiro" };
    assert.equal(groupClients([p], [r("1", "Ana", 10, "2026-11-01", "a")])[0]!.type, "parceiro");
    assert.equal(groupClients([m("b", "Bia", "b@x.com")], [r("2", "Bia", 10, "2026-11-01", "b")])[0]!.type, "pagante");
    assert.equal(groupClients([m("c", "Cid", "c@x.com")], [])[0]!.type, null);
  });
  it("internal media is ignored", () => {
    assert.equal(groupClients([m("a", null, null, "Notícias G1"), m("b", null, null, "tempo jundiai"), m("c", null, null, "ibovespa hoje"), m("d", null, null, "TelaHUB Anuncie Aqui")], []).length, 0);
  });
});
