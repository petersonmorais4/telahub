import { z } from "zod";

export const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const businessHoursSchema = z.array(z.array(z.object({ start: time, end: time }).refine((v) => v.start !== v.end, "A abertura e o fechamento devem ser diferentes.")).max(4)).length(7);
export type BusinessHours = z.infer<typeof businessHoursSchema>;

export function emptyBusinessHours(): BusinessHours {
  return Array.from({ length: 7 }, () => []);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

// Missing hours preserve legacy behaviour until the establishment's hours are filled in.
export function isWithinBusinessHours(hours: unknown, date: Date | string): boolean {
  if (hours === null || hours === undefined) return true;
  const parsed = businessHoursSchema.safeParse(hours);
  const instant = new Date(date);
  if (!parsed.success || Number.isNaN(instant.getTime())) return false;
  const parts = dateFormatter.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const day = WEEKDAYS.indexOf(value("weekday"));
  const now = Number(value("hour")) * 60 + Number(value("minute"));
  const today = parsed.data[day] ?? [];
  const yesterday = parsed.data[(day + 6) % 7] ?? [];
  return today.some(({ start, end }) => {
    const opening = minutes(start), closing = minutes(end);
    return closing > opening ? now >= opening && now < closing : now >= opening;
  }) || yesterday.some(({ start, end }) => minutes(end) < minutes(start) && now < minutes(end));
}