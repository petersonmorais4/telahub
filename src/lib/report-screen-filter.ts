import { isWithinBusinessHours } from "./business-hours";

export function filterReportScreens<T extends { screen_id: string | null; played_at?: string; screens: { name: string; business_hours?: unknown } | null }>(
  logs: T[],
  selectedIds: string[] | null,
): T[] {
  const selected = selectedIds === null ? null : new Set(selectedIds);
  return logs.filter((log) =>
    !/teste/i.test(log.screens?.name ?? "") &&
    (!log.played_at || isWithinBusinessHours(log.screens?.business_hours, log.played_at)) &&
    (selected === null || (log.screen_id !== null && selected.has(log.screen_id))),
  );
}