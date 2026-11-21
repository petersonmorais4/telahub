// Groups advertiser data (ad contacts + revenues) into one client folder.
// Union order: shared e-mail, contact name, revenue media_id, then ad title without orientation suffix.
export interface ClientMedia { id: string; title: string; type: string; active: boolean; start_date: string | null; end_date: string | null; client_name: string | null; client_email: string | null; client_phone?: string | null; send_report: boolean }
export interface ClientRevenue { id: string; client_name: string; amount: number; payment_date: string; payment_method: string; recurring: boolean; recurrence_days: number; media_id: string | null; description: string | null }
export interface ClientArt { key: string; title: string; versions: ClientMedia[] }
export interface ClientGroup { key: string; name: string; emails: string[]; phones: string[]; media: ClientMedia[]; arts: ClientArt[]; revenues: ClientRevenue[]; total: number; lastPayment: string | null; nextDue: string | null; hasContact: boolean }

export const clientKey = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

export const artKey = (title: string) =>
  clientKey(title.replace(/\.(png|jpe?g|webp|mp4|mov)$/i, "")).replace(/\b(vertical|horizontal)\b/g, "").replace(/\s+/g, " ").trim();

const INTERNAL = [/^noticias\b/, /^tempo\b/, /^ibovespa\b/, /^telahub\b/];
export const isInternalMedia = (title: string) => INTERNAL.some((r) => r.test(artKey(title)));

export function groupClients(media: ClientMedia[], revenues: ClientRevenue[]): ClientGroup[] {
  const parent = new Map<string, string>();
  const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) { parent.set(x, x); return x; } const r = find(p); parent.set(x, r); return r; };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };

  const ads = media.filter((m) => !isInternalMedia(m.title));
  for (const m of ads) {
    const node = `m:${m.id}`; find(node);
    if (m.client_email?.trim()) union(node, `e:${m.client_email.trim().toLowerCase()}`);
    if (m.client_name?.trim()) union(node, `n:${clientKey(m.client_name)}`);
    else if (!m.client_email?.trim()) union(node, `t:${artKey(m.title)}`);
  }
  const adIds = new Set(ads.map((m) => m.id));
  const internalIds = new Set(media.filter((m) => !adIds.has(m.id)).map((m) => m.id));
  const revs = revenues.filter((r) => !(r.media_id && internalIds.has(r.media_id)));
  for (const r of revs) {
    const node = `r:${r.id}`; find(node);
    if (r.media_id && adIds.has(r.media_id)) union(node, `m:${r.media_id}`);
    else if (r.client_name?.trim()) {
      const k = clientKey(r.client_name);
      union(node, parent.has(`n:${k}`) ? `n:${k}` : `t:${artKey(r.client_name)}`);
    }
  }

  const groups = new Map<string, ClientGroup>();
  const get = (root: string) => {
    let g = groups.get(root);
    if (!g) { g = { key: root, name: "", emails: [], phones: [], media: [], arts: [], revenues: [], total: 0, lastPayment: null, nextDue: null, hasContact: false }; groups.set(root, g); }
    return g;
  };
  for (const m of ads) {
    const g = get(find(`m:${m.id}`));
    g.media.push(m);
    if (m.client_name?.trim() || m.client_email?.trim()) g.hasContact = true;
    if (m.client_name?.trim() && !g.name) g.name = m.client_name.trim();
    const e = m.client_email?.trim(); if (e && !g.emails.some((x) => x.toLowerCase() === e.toLowerCase())) g.emails.push(e);
    const p = m.client_phone?.trim(); if (p && !g.phones.includes(p)) g.phones.push(p);
  }
  for (const r of revs) {
    const g = get(find(`r:${r.id}`));
    g.revenues.push(r);
    g.total += Number(r.amount) || 0;
    if (!g.lastPayment || r.payment_date > g.lastPayment) g.lastPayment = r.payment_date;
  }
  for (const g of groups.values()) {
    const arts = new Map<string, ClientArt>();
    for (const m of g.media) {
      const k = artKey(m.title);
      const a = arts.get(k) ?? { key: k, title: m.title.replace(/\s*\b(vertical|horizontal)\b\s*/gi, " ").trim(), versions: [] };
      a.versions.push(m); arts.set(k, a);
    }
    g.arts = [...arts.values()].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    if (!g.name) g.name = g.arts[0]?.title ?? g.revenues[0]?.client_name?.trim() ?? "Sem nome";
    const last = [...g.revenues].sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0];
    if (last?.recurring) {
      const d = new Date(last.payment_date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + (last.recurrence_days || 30));
      g.nextDue = d.toISOString().slice(0, 10);
    }
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
