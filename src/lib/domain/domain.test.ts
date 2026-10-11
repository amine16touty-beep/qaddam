import { describe, expect, it } from "vitest";
import { addDays, dayStartUtc, startOfWeek, todayIn, weekday } from "./dates";
import { regularity, showToday, streak, weekProgress, type HabitLike, type LogMap } from "./habits";
import { attentionReasons, dueBucket, projectProgress } from "./progress";

const MON = 1;
// 2026-10-11 is a Sunday
const today = "2026-10-11";
const logs = (...days: (string | [string, number])[]): LogMap =>
  new Map(days.map((d) => (Array.isArray(d) ? d : [d, 1])));

const daily: HabitLike = { frequency_type: "daily", weekdays: null, times_per_week: null, target_value: null, start_date: "2026-01-01" };

describe("dates", () => {
  it("knows weekdays and week starts", () => {
    expect(weekday(today)).toBe(0);
    expect(startOfWeek(today, MON)).toBe("2026-10-05");
    expect(startOfWeek(today, 0)).toBe("2026-10-11");
    expect(startOfWeek(today, 6)).toBe("2026-10-10");
  });
  it("computes today in the user's timezone, not UTC", () => {
    const lateUtc = new Date("2026-10-11T23:30:00Z");
    expect(todayIn("UTC", lateUtc)).toBe("2026-10-11");
    expect(todayIn("Africa/Algiers", lateUtc)).toBe("2026-10-12");
    expect(todayIn("America/New_York", new Date("2026-10-12T02:00:00Z"))).toBe("2026-10-11");
  });
  it("finds local midnight", () => {
    expect(dayStartUtc("2026-10-12", "Africa/Algiers").toISOString()).toBe("2026-10-11T23:00:00.000Z");
  });
  it("adds days across month ends and DST", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
  });
});

describe("habit streaks respect the schedule", () => {
  it("daily: today unfinished does not break the streak", () => {
    expect(streak(daily, logs("2026-10-10", "2026-10-09", "2026-10-08"), today, MON)).toEqual({ value: 3, unit: "days" });
  });
  it("daily: today done counts", () => {
    expect(streak(daily, logs(today, "2026-10-10"), today, MON).value).toBe(2);
  });
  it("daily: a missed day breaks it", () => {
    expect(streak(daily, logs("2026-10-10", "2026-10-08"), today, MON).value).toBe(1);
  });
  it("weekdays: rest days are skipped, not failures", () => {
    // Mon/Wed/Fri = 1,3,5. Fri 9, Wed 7, Mon 5 done; Sat/Sun rest.
    const h: HabitLike = { ...daily, frequency_type: "weekdays", weekdays: [1, 3, 5] };
    expect(streak(h, logs("2026-10-09", "2026-10-07", "2026-10-05"), today, MON).value).toBe(3);
    expect(isScheduledToday(h)).toBe(false);
  });
  it("weekdays: missing a scheduled day breaks it", () => {
    const h: HabitLike = { ...daily, frequency_type: "weekdays", weekdays: [1, 3, 5] };
    expect(streak(h, logs("2026-10-09", "2026-10-05"), today, MON).value).toBe(1);
  });
  it("times per week: counts consecutive weeks meeting the target; current week in progress does not break", () => {
    const gym: HabitLike = { ...daily, frequency_type: "times_per_week", times_per_week: 2 };
    // current week (Oct 5–11): 1 log; previous (Sep 28–Oct 4): 2; before (Sep 21–27): 3
    const l = logs("2026-10-06", "2026-09-29", "2026-10-02", "2026-09-21", "2026-09-23", "2026-09-25");
    expect(streak(gym, l, today, MON)).toEqual({ value: 2, unit: "weeks" });
    l.set("2026-10-08", 1);
    expect(streak(gym, l, today, MON).value).toBe(3);
  });
  it("numeric target: partial value is not done", () => {
    const english: HabitLike = { ...daily, target_value: 10 };
    expect(streak(english, logs(["2026-10-10", 10], ["2026-10-09", 5]), today, MON).value).toBe(1);
  });
  it("does not count before the start date", () => {
    const h: HabitLike = { ...daily, start_date: "2026-10-09" };
    expect(streak(h, logs("2026-10-10", "2026-10-09", "2026-10-08"), today, MON).value).toBe(2);
  });
});

function isScheduledToday(h: HabitLike) {
  return showToday(h, new Map(), today, MON);
}

describe("habit regularity", () => {
  it("daily: done ÷ scheduled, today excluded while open", () => {
    const r = regularity(daily, logs("2026-10-05", "2026-10-06", "2026-10-07"), "2026-10-05", today, today, MON);
    expect(r).toEqual({ done: 3, total: 6, pct: 50 });
  });
  it("weekdays: only scheduled days count", () => {
    const h: HabitLike = { ...daily, frequency_type: "weekdays", weekdays: [1, 3, 5] };
    const r = regularity(h, logs("2026-10-05", "2026-10-09"), "2026-10-05", today, today, MON);
    expect(r).toEqual({ done: 2, total: 3, pct: 67 });
  });
  it("times per week: over-achieving is capped, current unfinished week excluded", () => {
    const gym: HabitLike = { ...daily, frequency_type: "times_per_week", times_per_week: 2 };
    const l = logs("2026-09-28", "2026-09-29", "2026-09-30", "2026-10-06");
    const r = regularity(gym, l, "2026-09-28", today, today, MON);
    expect(r).toEqual({ done: 2, total: 2, pct: 100 });
  });
  it("no data yet → no percentage instead of a fake 0%", () => {
    const h: HabitLike = { ...daily, start_date: today };
    expect(regularity(h, new Map(), "2026-10-01", today, today, MON).pct).toBeNull();
  });
  it("week progress", () => {
    const gym: HabitLike = { ...daily, frequency_type: "times_per_week", times_per_week: 4 };
    expect(weekProgress(gym, logs("2026-10-06", "2026-10-08"), today, MON)).toEqual({ done: 2, target: 4 });
    const h: HabitLike = { ...daily, frequency_type: "weekdays", weekdays: [1, 3, 5] };
    expect(weekProgress(h, logs("2026-10-06", "2026-10-07"), today, MON)).toEqual({ done: 1, target: 3 });
  });
  it("weekly habit hides from Today once the week is complete", () => {
    const gym: HabitLike = { ...daily, frequency_type: "times_per_week", times_per_week: 2 };
    expect(showToday(gym, logs("2026-10-06", "2026-10-08"), today, MON)).toBe(false);
    expect(showToday(gym, logs("2026-10-06"), today, MON)).toBe(true);
  });
});

describe("project progress", () => {
  it("uses tasks and ignores cancelled ones", () => {
    expect(projectProgress([{ status: "done" }, { status: "todo" }, { status: "cancelled" }], [])).toEqual({ basis: "tasks", done: 1, total: 2, pct: 50 });
  });
  it("falls back to milestones", () => {
    expect(projectProgress([], [{ completed_at: "x" }, { completed_at: null }, { completed_at: null }, { completed_at: null }]).pct).toBe(25);
  });
  it("no steps → no percentage", () => {
    expect(projectProgress([], []).pct).toBeNull();
  });
  it("attention rules", () => {
    const base = { status: "active", lastActivityDay: today, targetDate: null, today, overdueCount: 0, progress: projectProgress([], []) };
    expect(attentionReasons(base)).toEqual([]);
    expect(attentionReasons({ ...base, lastActivityDay: "2026-10-02" })).toEqual([{ kind: "stale", days: 9 }]);
    expect(attentionReasons({ ...base, overdueCount: 2 })).toEqual([{ kind: "overdue", count: 2 }]);
    expect(attentionReasons({ ...base, targetDate: "2026-10-15" })).toEqual([{ kind: "deadline", days: 4, pct: 0 }]);
    expect(attentionReasons({ ...base, status: "paused", overdueCount: 3 })).toEqual([]);
  });
});

describe("follow-up buckets", () => {
  it("today / soon / overdue", () => {
    expect(dueBucket("2026-10-10", today)).toBe("overdue");
    expect(dueBucket(today, today)).toBe("today");
    expect(dueBucket("2026-10-18", today)).toBe("soon");
    expect(dueBucket("2026-10-19", today)).toBe("later");
    expect(dueBucket(null, today)).toBe("none");
  });
});

import { bestStreak } from "./habits";
describe("best streak", () => {
  it("finds the longest scheduled run", () => {
    const h: HabitLike = { ...daily, start_date: "2026-10-01" };
    expect(bestStreak(h, logs("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06"), today, MON)).toBe(3);
  });
  it("weekly", () => {
    const gym: HabitLike = { ...daily, frequency_type: "times_per_week", times_per_week: 1, start_date: "2026-09-14" };
    expect(bestStreak(gym, logs("2026-09-15", "2026-09-22", "2026-10-06"), today, MON)).toBe(2);
  });
});
