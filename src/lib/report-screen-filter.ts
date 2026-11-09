export function filterReportScreens<T extends { screen_id: string | null; screens: { name: string } | null }>(
  logs: T[],
  selectedIds: string[] | null,
): T[] {
  const selected = selectedIds === null ? null : new Set(selectedIds);
  return logs.filter((log) =>
    !/teste/i.test(log.screens?.name ?? "") &&
    (selected === null || (log.screen_id !== null && selected.has(log.screen_id))),
  );
}