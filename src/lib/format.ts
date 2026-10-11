/** Arabic-first formatting with Latin digits by default (setting: numerals). */
import type { ISODate } from "./domain/dates";

export type Numerals = "latn" | "arab";

const loc = (n: Numerals) => `ar-u-nu-${n}`;

const parseDay = (d: ISODate) => new Date(d + "T12:00:00Z");

export function fmtDay(d: ISODate, n: Numerals = "latn", opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(loc(n), { ...opts, timeZone: "UTC" }).format(parseDay(d));
}

export function fmtShortDay(d: ISODate, n: Numerals = "latn") {
  return new Intl.DateTimeFormat(loc(n), { day: "numeric", month: "short", timeZone: "UTC" }).format(parseDay(d));
}

export function fmtTime(iso: string | Date, tz: string, n: Numerals = "latn") {
  return new Intl.DateTimeFormat(loc(n), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date(iso));
}

export function fmtDateTime(iso: string, tz: string, n: Numerals = "latn") {
  return new Intl.DateTimeFormat(loc(n), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date(iso));
}

export function fmtNum(v: number, n: Numerals = "latn") {
  return new Intl.NumberFormat(loc(n)).format(v);
}

export function fmtMonth(d: ISODate, n: Numerals = "latn") {
  return new Intl.DateTimeFormat(loc(n), { month: "long", year: "numeric", timeZone: "UTC" }).format(parseDay(d));
}

/** Weekday names starting Sunday (index = 0…6). */
export function weekdayNames(n: Numerals = "latn", style: "long" | "short" | "narrow" = "short") {
  const f = new Intl.DateTimeFormat(loc(n), { weekday: style, timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2026, 9, 11 + i, 12))));
}
