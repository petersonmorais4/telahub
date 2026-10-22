import { expect, test } from "vitest";
import { isOnline } from "./signage";
test("tela sem sinal há mais de 45s fica offline", () => {
  expect(isOnline(new Date(Date.now() - 50_000).toISOString())).toBe(false);
  expect(isOnline(new Date(Date.now() - 20_000).toISOString())).toBe(true);
});
