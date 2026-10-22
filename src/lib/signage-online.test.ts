import { test } from "node:test";
import assert from "node:assert/strict";
import { isOnline } from "./signage";
test("tela sem sinal há mais de 45s fica offline", () => {
  assert.equal(isOnline(new Date(Date.now() - 50_000).toISOString()), false);
  assert.equal(isOnline(new Date(Date.now() - 20_000).toISOString()), true);
});
