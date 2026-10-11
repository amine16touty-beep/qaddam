"use client";
import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Flame, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { logHabit } from "@/app/actions/habits";
import { useShell } from "@/components/shell/shell-context";
import { Sheet } from "@/components/ui/sheet";
import { Button, Input } from "@/components/ui";
import type { HabitView } from "@/lib/queries/habits";

/** One tap logs the habit (full target). The slider icon enters a partial value. */
export function HabitToggle({ habit, variant = "row" }: { habit: HabitView; variant?: "row" | "chip" }) {
  const t = useTranslations("habit");
  const ta = useTranslations("app");
  const { data } = useShell();
  const [, start] = useTransition();
  const [opt, setOpt] = useOptimistic({ v: habit.todayValue, done: habit.doneToday }, (_, n: { v: number; done: boolean }) => n);
  const [partial, setPartial] = useState(false);
  const full = habit.target_value ?? 1;

  const write = (value: number) =>
    start(async () => {
      const prev = habit.todayValue;
      setOpt({ v: value, done: habit.target_value ? value >= habit.target_value : value > 0 });
      if (value > 0 && navigator.vibrate) navigator.vibrate(10);
      const r = await logHabit(habit.id, data.today, value);
      if (!r.ok) return void toast.error(r.error);
      if (value > 0)
        toast.success(`${habit.name} · ${t("logged")}`, {
          action: { label: ta("undo"), onClick: () => logHabit(habit.id, data.today, prev) },
        });
    });

  const tap = () => write(opt.done ? 0 : full);
  const progressText =
    habit.target_value != null
      ? `${opt.v}/${habit.target_value}${habit.target_unit ? " " + habit.target_unit : ""}`
      : habit.frequency_type === "times_per_week"
        ? t("weekProgress", { done: habit.week.done + (opt.done && !habit.doneToday ? 1 : !opt.done && habit.doneToday ? -1 : 0), target: habit.week.target })
        : null;

  const partialSheet = (
    <Sheet open={partial} onClose={() => setPartial(false)} title={`${habit.name} · ${t("logValue")}`}>
      <form
        className="flex items-end gap-2"
        action={(f) => {
          const v = Number(f.get("v"));
          setPartial(false);
          if (!Number.isNaN(v)) write(Math.max(0, v));
        }}
      >
        <Input name="v" type="number" min={0} step="any" defaultValue={opt.v || ""} autoFocus aria-label={t("targetValue")} className="flex-1" />
        {habit.target_unit && <span className="pb-2 text-sm text-ink-muted">{habit.target_unit}</span>}
        <Button type="submit">{ta("save")}</Button>
      </form>
    </Sheet>
  );

  if (variant === "chip") {
    return (
      <>
        <button
          type="button"
          onClick={tap}
          aria-pressed={opt.done}
          className={cn(
            "flex min-h-14 min-w-32 shrink-0 flex-col items-start justify-center rounded-2xl border px-3.5 py-2 text-start transition-colors",
            opt.done ? "border-success/30 bg-success-soft text-success" : "border-line bg-surface hover:border-primary/40",
          )}
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border-[1.5px]", opt.done ? "border-success bg-success text-white" : "border-ink-muted/50")}>
              {opt.done && (
                <svg viewBox="0 0 24 24" className="check-draw h-2.5 w-2.5" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" /></svg>
              )}
            </span>
            {habit.name}
          </span>
          {progressText && <span className="text-xs text-ink-muted">{progressText}</span>}
        </button>
        {partialSheet}
      </>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60">
      <button
        type="button"
        onClick={tap}
        aria-pressed={opt.done}
        aria-label={`${habit.name}: ${opt.done ? t("unlog") : t("log")}`}
        className="-m-2 p-2"
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] transition-colors",
            opt.done ? "border-success bg-success text-white" : "border-ink-muted/50 hover:border-primary hover:bg-primary-soft",
          )}
        >
          {opt.done && (
            <svg viewBox="0 0 24 24" className="check-draw h-4 w-4" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          )}
        </span>
      </button>
      <Link href={`/habits/${habit.id}`} className="min-w-0 flex-1">
        <span className={cn("block text-[15px]", opt.done && "text-ink-muted")}>{habit.name}</span>
        <span className="flex items-center gap-3 text-xs text-ink-muted">
          {progressText && <span>{progressText}</span>}
          {habit.streak.value > 0 && (
            <span className="inline-flex items-center gap-0.5 text-warning">
              <Flame size={12} /> {habit.streak.value}
            </span>
          )}
        </span>
      </Link>
      {habit.target_value != null && (
        <button type="button" onClick={() => setPartial(true)} aria-label={t("logValue")} className="rounded-lg p-2 text-ink-muted hover:bg-muted">
          <SlidersHorizontal size={16} />
        </button>
      )}
      {partialSheet}
    </div>
  );
}
