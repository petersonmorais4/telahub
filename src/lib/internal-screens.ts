// Telas internas (site, teste, a definir, demonstração) não geram alertas de TV desligada.
const INTERNAL = [/teste?/i, /\bsite\b/i, /a\s+definir/i, /demo/i, /exemplo/i, /provis[oó]ri/i];
export const isInternalScreen = (name: string | null | undefined) =>
  INTERNAL.some((r) => r.test(name ?? ""));
