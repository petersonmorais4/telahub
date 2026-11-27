import { test } from "node:test";
import assert from "node:assert/strict";
import { isInternalScreen } from "./internal-screens";

test("internal screens are ignored in offline alerts", () => {
  for (const n of ["Tela de exibição Site", "Ponto a definir", "Tela Teste", "Test TV"]) assert.equal(isInternalScreen(n), true, n);
});
test("real points still trigger alerts", () => {
  for (const n of ["Fazendinha do Leo", "VIBE FIT", "Studio S&A Jundiaí", "Evandro Barbearia"]) assert.equal(isInternalScreen(n), false, n);
});
