import "server-only";
import type { Session } from "@/lib/session";
import { addDays } from "@/lib/domain/dates";
import { isDoneValue, isScheduled, regularity, showToday, streak, toLogMap, weekProgress, type HabitLike, type LogMap } from "@/lib/domain/habits";

export type HabitRow = HabitLike & {
  id: string;
  name: string;
  target_unit: string | null;
  preferred_time: string | null;
  context_id: string | null;
  goal_id: string | null;
  archived_at: string | null;
  position: number;
};

export type HabitView = {
  id: string;
  name: string;
  frequency_type: HabitLike["frequency_type"];
  weekdays: number[] | null;
  times_per_week: number | null;
  target_value: number | null;
  target_unit: string | null;
  preferred_time: string | null;
  context_id: string | null;
  todayValue: number;
  doneToday: boolean;
  scheduledToday: boolean;
  showToday: boolean;
  week: { done: number; target: number };
  streak: { value: number; unit: "days" | "weeks" };
  regularity30: { done: number; total: number; pct: number | null };
  archived: boolean;
};

/** Loads habits + enough history for streaks (1 year) and computes the views server-side. */
export async function loadHabits(s: Session, opts: { includeArchived?: boolean; ids?: string[] } = {}) {
  let q = s.supabase.from("habits").select("*").is("deleted_at", null).order("position").order("created_at");
  if (!opts.includeArchived) q = q.is("archived_at", null);
  if (s.contextFilter) q = q.eq("context_id", s.contextFilter);
  if (opts.ids) q = q.in("id", opts.ids);
  const { data: habits } = await q;
  if (!habits?.length) return { habits: [] as HabitView[], logs: new Map<string, LogMap>(), rows: [] as HabitRow[] };

  const since = addDays(s.today, -400);
  const { data: logRows } = await s.supabase
    .from("habit_logs")
    .select("habit_id, log_date, value")
    .in("habit_id", habits.map((h) => h.id))
    .gte("log_date", since)
    .limit(20000);

  const logs = new Map<string, LogMap>();
  for (const h of habits) logs.set(h.id, toLogMap((logRows ?? []).filter((l) => l.habit_id === h.id)));

  const rows = habits.map((h) => ({ ...h, target_value: h.target_value === null ? null : Number(h.target_value) })) as unknown as HabitRow[];
  const views: HabitView[] = rows.map((h) => {
    const l = logs.get(h.id)!;
    const v = l.get(s.today) ?? 0;
    return {
      id: h.id,
      name: h.name,
      frequency_type: h.frequency_type,
      weekdays: h.weekdays,
      times_per_week: h.times_per_week,
      target_value: h.target_value,
      target_unit: h.target_unit,
      preferred_time: h.preferred_time,
      context_id: h.context_id,
      todayValue: v,
      doneToday: isDoneValue(h, l.get(s.today)),
      scheduledToday: isScheduled(h, s.today),
      showToday: showToday(h, l, s.today, s.weekStart),
      week: weekProgress(h, l, s.today, s.weekStart),
      streak: streak(h, l, s.today, s.weekStart),
      regularity30: regularity(h, l, addDays(s.today, -29), s.today, s.today, s.weekStart),
      archived: !!h.archived_at,
    };
  });
  return { habits: views, logs, rows };
}
