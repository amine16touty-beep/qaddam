/**
 * Calendar-day helpers. A "day" is an ISO string `yyyy-MM-dd` interpreted in the
 * user's timezone. Arithmetic is done in UTC so it never drifts with DST.
 */
import { formatInTimeZone } from "date-fns-tz";

export type ISODate = string;

export function todayIn(tz: string, now: Date = new Date()): ISODate {
  return formatInTimeZone(now, tz, "yyyy-MM-dd");
}

export function hourIn(tz: string, now: Date = new Date()): number {
  return Number(formatInTimeZone(now, tz, "H"));
}

const toUTC = (d: ISODate) => {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
};
const fromUTC = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * 86_400_000);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a) - toUTC(b)) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(d: ISODate): number {
  return new Date(toUTC(d)).getUTCDay();
}

export function startOfWeek(d: ISODate, weekStart: number): ISODate {
  return addDays(d, -((weekday(d) - weekStart + 7) % 7));
}

export function startOfMonth(d: ISODate): ISODate {
  return d.slice(0, 8) + "01";
}

export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return fromUTC(dt.getTime());
}

export function daysInRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The UTC instant at which local midnight of `d` starts in `tz`. */
export function dayStartUtc(d: ISODate, tz: string): Date {
  // offset of tz at noon that day is good enough to find local midnight
  const noonUtc = new Date(toUTC(d) + 12 * 3_600_000);
  const local = formatInTimeZone(noonUtc, tz, "yyyy-MM-dd'T'HH:mm:ss");
  const offsetMs = Date.parse(local + "Z") - noonUtc.getTime();
  return new Date(toUTC(d) - offsetMs);
}

export function greetingKey(hour: number): "morning" | "evening" {
  return hour >= 4 && hour < 12 ? "morning" : "evening";
}
