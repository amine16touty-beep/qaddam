import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight, Flame, Repeat, Trophy } from "lucide-react";
import { getSession } from "@/lib/session";
import { loadHabits } from "@/lib/queries/habits";
import { addDays, startOfWeek } from "@/lib/domain/dates";
import { bestStreak, isDoneValue, isScheduled } from "@/lib/domain/habits";
import { fmtDay, weekdayNames } from "@/lib/format";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { HelpTip } from "@/components/ui/help-tip";
import { HabitToggle } from "@/components/habits/habit-toggle";
import { HabitActions, Heatmap, type HeatCell } from "@/components/habits/habit-editor";

export default async function HabitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const s = await getSession();
  const t = await getTranslations();
  const { habits, logs, rows } = await loadHabits({ ...s, contextFilter: null }, { includeArchived: true, ids: [id] });
  const h = habits[0];
  const row = rows[0];
  if (!h) notFound();
  const l = logs.get(id)!;

  // 26 weeks heatmap
  const lastWs = startOfWeek(s.today, s.weekStart);
  const weeks: HeatCell[][] = [];
  for (let w = 25; w >= 0; w--) {
    const ws = addDays(lastWs, -7 * w);
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(ws, i);
        const v = l.get(d) ?? 0;
        const state: HeatCell["state"] =
          d > s.today ? "future"
          : d < row.start_date && !v ? "before"
          : isDoneValue(row, v) ? "done"
          : v > 0 ? "partial"
          : !isScheduled(row, d) || row.frequency_type === "times_per_week" ? "rest"
          : d === s.today ? "future"
          : "missed";
        return { date: d, state, value: v };
      }),
    );
  }
  const names = weekdayNames(s.numerals, "short");
  const rowLabels = Array.from({ length: 7 }, (_, i) => names[(s.weekStart + i) % 7]);
  const history = [...l.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 20);
  const best = bestStreak(row, l, s.today, s.weekStart);
  const freqLabel =
    h.frequency_type === "daily" ? t("habit.daily")
    : h.frequency_type === "weekdays" ? (h.weekdays ?? []).map((d) => names[d]).join("، ")
    : t("habit.perWeek", { n: h.times_per_week ?? 0 });

  return (
    <div>
      <Link href="/progress/habits" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary">
        <ChevronRight size={15} /> {t("habit.habits")}
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{h.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <Repeat size={14} /> {freqLabel}
            {h.target_value != null && ` · ${h.target_value} ${h.target_unit ?? ""}`}
            {h.preferred_time && <span dir="ltr"> · {h.preferred_time.slice(0, 5)}</span>}
          </p>
        </div>
        <HabitActions habit={h} />
      </div>

      {!h.archived && (
        <Card className="mb-5 px-2 py-2">
          <HabitToggle habit={h} />
        </Card>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={h.streak.unit === "weeks" ? t("habit.streakWeeks", { n: h.streak.value }) : t("habit.streakDays", { n: h.streak.value })} value={h.streak.value} icon={<Flame size={16} className="text-warning" />} />
        <Stat label={t("habit.bestStreak")} value={best} icon={<Trophy size={16} className="text-primary" />} />
        <Stat
          label={t("habit.regularity30")}
          value={h.regularity30.pct === null ? "—" : `${h.regularity30.pct}%`}
          sub={h.regularity30.total ? `${h.regularity30.done}/${h.regularity30.total}` : undefined}
          help={h.frequency_type === "times_per_week" ? t("habit.regularityHelpWeekly") : t("habit.regularityHelpDaily")}
        />
        <Stat label={t("habit.thisWeek")} value={`${h.week.done}/${h.week.target}`} />
      </div>

      <Card className="mb-5">
        <CardHeader title={t("habit.heatmap")} />
        <div className="px-4 pb-4">
          <Heatmap habitId={h.id} weeks={weeks} rowLabels={rowLabels} target={h.target_value ?? 1} />
        </div>
      </Card>

      <Card>
        <CardHeader title={t("habit.history")} />
        <div className="px-4 pb-3">
          {history.length ? (
            <ul className="divide-y divide-line">
              {history.map(([d, v]) => (
                <li key={d} className="flex justify-between py-2 text-sm">
                  <span>{fmtDay(d, s.numerals)}</span>
                  <span className={isDoneValue(row, v) ? "text-success" : "text-ink-muted"}>
                    {h.target_value != null ? `${v}/${h.target_value} ${h.target_unit ?? ""}` : "✓"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("habit.noLogs")} className="py-4" />
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, icon, help }: { label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode; help?: string }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-2xl font-semibold">{icon}{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
        {label} {sub && <span>· {sub}</span>} {help && <HelpTip text={help} />}
      </p>
    </Card>
  );
}
