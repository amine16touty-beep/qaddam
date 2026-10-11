import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, Flame, Repeat } from "lucide-react";
import { getSession } from "@/lib/session";
import { loadHabits } from "@/lib/queries/habits";
import { weekdayNames } from "@/lib/format";
import { Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { HabitToggle } from "@/components/habits/habit-toggle";
import { AddTaskButton } from "../../today/today-client";

export const metadata = { title: "العادات" };

export default async function HabitsPage() {
  const s = await getSession();
  const t = await getTranslations();
  const { habits } = await loadHabits(s, { includeArchived: true });
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const names = weekdayNames(s.numerals, "short");

  return (
    <div>
      <Link href="/progress" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary">
        <ChevronRight size={15} /> {t("progress.title")}
      </Link>
      <PageHeader title={t("habit.habits")} actions={<AddTaskButton label={t("habit.new")} type="habit" />} />
      {active.length === 0 ? (
        <Card><EmptyState icon={<Repeat size={32} />} title={t("habit.empty")} action={<AddTaskButton label={t("habit.new")} type="habit" />} /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {active.map((h) => (
            <Card key={h.id} className="p-2">
              <HabitToggle habit={h} />
              <div className="px-2 pt-1 pb-2">
                <div className="mb-1 flex justify-between text-xs text-ink-muted">
                  <span>
                    {h.frequency_type === "daily" ? t("habit.daily") : h.frequency_type === "weekdays" ? (h.weekdays ?? []).map((d) => names[d]).join("، ") : t("habit.perWeek", { n: h.times_per_week ?? 0 })}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {h.streak.value > 0 && <span className="inline-flex items-center gap-0.5 text-warning"><Flame size={12} />{h.streak.value}</span>}
                    {h.regularity30.pct !== null ? `${h.regularity30.pct}%` : t("progress.noData")}
                  </span>
                </div>
                <ProgressBar value={h.regularity30.pct} tone="success" label={t("habit.regularity30")} />
              </div>
            </Card>
          ))}
        </div>
      )}
      {archived.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-ink-muted">{t("habit.archive")} ({archived.length})</h2>
          <Card className="px-2 py-2">
            {archived.map((h) => (
              <Link key={h.id} href={`/habits/${h.id}`} className="block rounded-lg px-2 py-2 text-ink-muted hover:bg-muted">{h.name}</Link>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
