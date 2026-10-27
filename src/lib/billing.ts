export interface RevenueLike {
  media_id: string | null;
  client_name: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  recurrence_days: number;
  recurring: boolean;
}

export interface BillingReminder<T extends RevenueLike> {
  key: string;
  last: T;
  dueDate: string;
  daysLeft: number;
}

const DAY = 86_400_000;
const toUtc = (d: string) => Date.parse(`${d}T00:00:00Z`);

export function addDays(date: string, days: number) {
  return new Date(toUtc(date) + days * DAY).toISOString().slice(0, 10);
}

/** Último pagamento de cada cliente/anúncio recorrente; lembra quando faltam `warnDays` dias ou menos. */
export function billingReminders<T extends RevenueLike>(rows: T[], today: string, warnDays = 5) {
  const latest = new Map<string, T>();
  for (const r of rows) {
    const key = r.media_id ?? `cliente:${r.client_name.trim().toLowerCase()}`;
    const cur = latest.get(key);
    if (!cur || r.payment_date > cur.payment_date) latest.set(key, r);
  }
  const out: BillingReminder<T>[] = [];
  for (const [key, last] of latest) {
    if (!last.recurring) continue;
    const dueDate = addDays(last.payment_date, last.recurrence_days || 30);
    const daysLeft = Math.round((toUtc(dueDate) - toUtc(today)) / DAY);
    if (daysLeft <= warnDays) out.push({ key, last, dueDate, daysLeft });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
