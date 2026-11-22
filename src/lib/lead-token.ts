// Per-lead secret: the browser keeps the token, the row stores only its SHA-256, so only the submitter can trigger the notice.
export async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function newLeadToken() {
  const token = crypto.randomUUID() + crypto.randomUUID();
  return { token, hash: await sha256Hex(token) };
}
