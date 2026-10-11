import { addDays, diffDays, startOfWeek, weekday, type ISODate } from "./dates";

export type FrequencyType = "daily" | "weekdays" | "times_per_week";

export interface HabitLike {
  frequency_type: FrequencyType;
  weekdays: number[] | null;
  times_per_week: number | null;
  target_value: number | null;
  start_date: ISODate;
}

/** date -> logged value */
export type LogMap = Map<ISODate, number>;

export function isDoneValue(h: Pick<HabitLike, "target_value">, value: number | undefined): boolean {
  if (value === undefined) return false;
  return h.target_value ? value >= h.target_value : value > 0;
}

/** Is a check-in *expected* on this day? (times_per_week: any day may count) */
export function isScheduled(h: HabitLike, d: ISODate): boolean {
  if (d < h.start_date) return false;
  if (h.frequency_type === "weekdays") return (h.weekdays ?? []).includes(weekday(d));
  return true;
}

function doneOn(h: HabitLike, logs: LogMap, d: ISODate) {
  return isDoneValue(h, logs.get(d));
}

export function weekDoneCount(h: HabitLike, logs: LogMap, weekStartDay: ISODate): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (doneOn(h, logs, addDays(weekStartDay, i))) n++;
  return n;
}

/** Progress for the current week: "done of target". */
export function weekProgress(h: HabitLike, logs: LogMap, today: ISODate, weekStart: number) {
  const ws = startOfWeek(today, weekStart);
  if (h.frequency_type === "times_per_week") {
    return { done: Math.min(weekDoneCount(h, logs, ws), 7), target: h.times_per_week ?? 1 };
  }
  let target = 0;
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    if (isScheduled(h, d)) {
      target++;
      if (doneOn(h, logs, d)) done++;
    }
  }
  return { done, target };
}

/**
 * Streak that respects the schedule:
 *  - daily / weekdays → consecutive *scheduled* days done (unscheduled days are skipped, not failures)
 *  - times_per_week   → consecutive *weeks* that met the weekly target
 * Today (or this week) never breaks a streak before it is over.
 */
export function streak(h: HabitLike, logs: LogMap, today: ISODate, weekStart: number): { value: number; unit: "days" | "weeks" } {
  if (h.frequency_type === "times_per_week") {
    const target = h.times_per_week ?? 1;
    let ws = startOfWeek(today, weekStart);
    let n = 0;
    if (weekDoneCount(h, logs, ws) >= target) n++;
    ws = addDays(ws, -7);
    while (addDays(ws, 6) >= h.start_date && n < 1000) {
      if (weekDoneCount(h, logs, ws) >= target) n++;
      else break;
      ws = addDays(ws, -7);
    }
    return { value: n, unit: "weeks" };
  }

  let n = 0;
  let d = today;
  if (isScheduled(h, d) && !doneOn(h, logs, d)) d = addDays(d, -1); // today still open
  for (let guard = 0; d >= h.start_date && guard < 3700; guard++, d = addDays(d, -1)) {
    if (!isScheduled(h, d)) continue;
    if (doneOn(h, logs, d)) n++;
    else break;
  }
  return { value: n, unit: "days" };
}

/**
 * Regularity over [from, to] (inclusive), never counting the future.
 *  - daily / weekdays → done scheduled days ÷ scheduled days. Today counts only if done.
 *  - times_per_week   → Σ min(done, target) ÷ Σ target over full weeks; the current week counts only if met.
 */
export function regularity(h: HabitLike, logs: LogMap, from: ISODate, to: ISODate, today: ISODate, weekStart: number) {
  if (to > today) to = today;
  if (from < h.start_date) from = h.start_date;
  if (from > to) return { done: 0, total: 0, pct: null as number | null };

  if (h.frequency_type === "times_per_week") {
    const target = h.times_per_week ?? 1;
    const currentWs = startOfWeek(today, weekStart);
    let done = 0;
    let total = 0;
    for (let ws = startOfWeek(from, weekStart); ws <= to; ws = addDays(ws, 7)) {
      const count = weekDoneCount(h, logs, ws);
      if (ws === currentWs && count < target) continue; // week still in progress
      done += Math.min(count, target);
      total += target;
    }
    return { done, total, pct: total ? Math.round((done / total) * 100) : null };
  }

  let done = 0;
  let total = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    const ok = doneOn(h, logs, d);
    if (d === today && !ok) continue; // today still open
    total++;
    if (ok) done++;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : null };
}

/** Should the habit appear on Today? */
export function showToday(h: HabitLike, logs: LogMap, today: ISODate, weekStart: number): boolean {
  if (!isScheduled(h, today)) return false;
  if (h.frequency_type === "times_per_week") {
    // keep showing it if done today, hide only when the week is already complete and nothing logged today
    const { done, target } = weekProgress(h, logs, today, weekStart);
    return done < target || logs.has(today);
  }
  return true;
}

export function toLogMap(rows: { log_date: string; value: number | string }[]): LogMap {
  return new Map(rows.map((r) => [r.log_date, Number(r.value)]));
}

export { diffDays };

/** Longest streak ever, using the same rules as `streak`. */
export function bestStreak(h: HabitLike, logs: LogMap, today: ISODate, weekStart: number): number {
  let best = 0;
  let run = 0;
  if (h.frequency_type === "times_per_week") {
    const target = h.times_per_week ?? 1;
    const current = startOfWeek(today, weekStart);
    for (let ws = startOfWeek(h.start_date, weekStart); ws <= current; ws = addDays(ws, 7)) {
      const ok = weekDoneCount(h, logs, ws) >= target;
      if (ok) best = Math.max(best, ++run);
      else if (ws !== current) run = 0;
    }
    return best;
  }
  for (let d = h.start_date; d <= today; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    if (doneOn(h, logs, d)) best = Math.max(best, ++run);
    else if (d !== today) run = 0;
  }
  return best;
}
