// Groups advertiser data (ad contacts + revenues) into one client view by normalized name.
export interface ClientMedia { id: string; title: string; type: string; active: boolean; start_date: string | null; end_date: string | null; client_name: string | null; client_email: string | null; send_report: boolean }
export interface ClientRevenue { id: string; client_name: string; amount: number; payment_date: string; payment_method: string; recurring: boolean; recurrence_days: number; media_id: string | null; description: string | null }
export interface ClientGroup { key: string; name: string; emails: string[]; media: ClientMedia[]; revenues: ClientRevenue[]; total: number; lastPayment: string | null; nextDue: string | null }

export const clientKey = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

export function groupClients(media: ClientMedia[], revenues: ClientRevenue[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();
  const mediaClient = new Map<string, string>();
  const get = (name: string) => {
    const key = clientKey(name);
    let g = map.get(key);
    if (!g) { g = { key, name: name.trim(), emails: [], media: [], revenues: [], total: 0, lastPayment: null, nextDue: null }; map.set(key, g); }
    return g;
  };
  for (const m of media) {
    if (!m.client_name?.trim()) continue;
    const g = get(m.client_name);
    g.media.push(m);
    mediaClient.set(m.id, g.key);
    if (m.client_email && !g.emails.includes(m.client_email)) g.emails.push(m.client_email);
  }
  for (const r of revenues) {
    const g = r.client_name?.trim() ? get(r.client_name) : r.media_id && mediaClient.has(r.media_id) ? map.get(mediaClient.get(r.media_id)!)! : null;
    if (!g) continue;
    g.revenues.push(r);
    g.total += Number(r.amount) || 0;
    if (!g.lastPayment || r.payment_date > g.lastPayment) g.lastPayment = r.payment_date;
  }
  for (const g of map.values()) {
    const last = [...g.revenues].sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0];
    if (last?.recurring) {
      const d = new Date(last.payment_date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + (last.recurrence_days || 30));
      g.nextDue = d.toISOString().slice(0, 10);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
