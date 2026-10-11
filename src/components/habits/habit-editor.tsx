"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, Field, Input, Select } from "@/components/ui";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { weekdayNames } from "@/lib/format";
import { archiveHabit, deleteHabit, logHabit, restoreHabit, updateHabit } from "@/app/actions/habits";
import { useShell } from "@/components/shell/shell-context";

type H = {
  id: string;
  name: string;
  frequency_type: "daily" | "weekdays" | "times_per_week";
  weekdays: number[] | null;
  times_per_week: number | null;
  target_value: number | null;
  target_unit: string | null;
  preferred_time: string | null;
  context_id: string | null;
  archived: boolean;
};

export function HabitActions({ habit }: { habit: H }) {
  const t = useTranslations();
  const router = useRouter();
  const { data } = useShell();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [freq, setFreq] = useState(habit.frequency_type);
  const [days, setDays] = useState<number[]>(habit.weekdays ?? []);
  const [error, setError] = useState<string>();
  const { confirm, dialog } = useConfirm();
  const names = weekdayNames(data.numerals, "short");
  const order = Array.from({ length: 7 }, (_, i) => (data.weekStart + i) % 7);
  const chip = (on: boolean) => cn("h-8 rounded-full border px-3 text-[13px]", on ? "border-primary bg-primary-soft text-primary font-medium" : "border-line text-ink-muted");

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><Pencil size={15} /> {t("app.edit")}</Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => start(async () => { await archiveHabit(habit.id, !habit.archived); })}
        disabled={pending}
      >
        {habit.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />} {t("habit.archive")}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("app.delete")}
        onClick={async () => {
          if (!(await confirm(t("habit.deleteConfirm")))) return;
          const r = await deleteHabit(habit.id);
          if (!r.ok) return void toast.error(r.error);
          router.push("/progress/habits");
          toast(t("app.deleted"), { action: { label: t("app.undo"), onClick: () => restoreHabit(habit.id).then(() => router.push(`/habits/${habit.id}`)) } });
        }}
      >
        <Trash2 size={15} />
      </Button>
      {dialog}
      <Sheet open={open} onClose={() => setOpen(false)} title={t("app.edit")}>
        <form
          className="space-y-4"
          action={(f) =>
            start(async () => {
              const r = await updateHabit(habit.id, {
                name: String(f.get("name")),
                frequency_type: freq,
                weekdays: freq === "weekdays" ? days : null,
                times_per_week: freq === "times_per_week" ? Number(f.get("times")) : null,
                target_value: f.get("target_value") ? Number(f.get("target_value")) : null,
                target_unit: String(f.get("target_unit") ?? ""),
                preferred_time: String(f.get("preferred_time") ?? ""),
                context_id: String(f.get("context_id") ?? "") || null,
              });
              if (!r.ok) return setError(r.error);
              setOpen(false);
            })
          }
        >
          <Field label={t("habit.name")} htmlFor="he-name">
            <Input id="he-name" name="name" defaultValue={habit.name} required maxLength={120} />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("habit.frequency")}</p>
            <div className="flex flex-wrap gap-1.5">
              {(["daily", "weekdays", "times_per_week"] as const).map((f) => (
                <button type="button" key={f} aria-pressed={freq === f} className={chip(freq === f)} onClick={() => setFreq(f)}>
                  {t(`habit.${f === "times_per_week" ? "timesPerWeek" : f}`)}
                </button>
              ))}
            </div>
            {freq === "weekdays" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {order.map((d) => (
                  <button type="button" key={d} aria-pressed={days.includes(d)} className={cn(chip(days.includes(d)), "w-12 px-0")} onClick={() => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}>
                    {names[d]}
                  </button>
                ))}
              </div>
            )}
            {freq === "times_per_week" && (
              <div className="mt-2 flex items-center gap-2">
                <Input name="times" type="number" min={1} max={7} defaultValue={habit.times_per_week ?? 3} className="w-20" aria-label={t("habit.timesLabel")} />
                <span className="text-sm text-ink-muted">{t("habit.timesLabel")}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("habit.target")} htmlFor="he-tv">
              <Input id="he-tv" name="target_value" type="number" min={0} step="any" defaultValue={habit.target_value ?? ""} />
            </Field>
            <Field label={t("habit.targetUnit")} htmlFor="he-tu">
              <Input id="he-tu" name="target_unit" defaultValue={habit.target_unit ?? ""} placeholder={t("habit.unitPlaceholder")} maxLength={30} />
            </Field>
            <Field label={t("habit.time")} htmlFor="he-time">
              <Input id="he-time" name="preferred_time" type="time" defaultValue={habit.preferred_time?.slice(0, 5) ?? ""} />
            </Field>
            <Field label={t("task.context")} htmlFor="he-ctx">
              <Select id="he-ctx" name="context_id" defaultValue={habit.context_id ?? ""}>
                <option value="">{t("app.none")}</option>
                {data.contexts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending || (freq === "weekdays" && !days.length)}>{t("app.save")}</Button>
        </form>
      </Sheet>
    </div>
  );
}

export type HeatCell = { date: string; state: "done" | "partial" | "missed" | "rest" | "future" | "before"; value: number };

/** Weeks as columns, weekdays as rows. Click a past day to fix its log. */
export function Heatmap({ habitId, weeks, rowLabels, target }: { habitId: string; weeks: HeatCell[][]; rowLabels: string[]; target: number }) {
  const t = useTranslations("habit");
  const [, start] = useTransition();
  const color = {
    done: "bg-success",
    partial: "bg-success/40",
    missed: "bg-muted border border-line",
    rest: "bg-transparent border border-dashed border-line",
    future: "bg-transparent",
    before: "bg-transparent",
  };
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        <div className="flex flex-col gap-1 pe-1 text-[10px] text-ink-muted">
          {rowLabels.map((l, i) => <span key={i} className="flex h-3.5 items-center">{i % 2 === 0 ? l : ""}</span>)}
        </div>
        {/* RTL flow: oldest week next to the labels, newest at the far end */}
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-1">
            {w.map((c) => (
              <button
                key={c.date}
                type="button"
                disabled={c.state === "future" || c.state === "before"}
                title={`${c.date}${c.state === "rest" ? " · " + t("restDay") : c.value ? " · " + c.value : ""}`}
                aria-label={`${c.date}: ${c.state === "done" ? t("logged") : c.state === "rest" ? t("restDay") : "—"}`}
                onClick={() =>
                  start(async () => {
                    const r = await logHabit(habitId, c.date, c.state === "done" ? 0 : target);
                    if (!r.ok) toast.error(r.error);
                  })
                }
                className={cn("h-3.5 w-3.5 rounded-[4px] transition-transform hover:scale-125 disabled:hover:scale-100", color[c.state])}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] bg-success" /> {t("logged")}</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] bg-success/40" /> {t("logValue")}</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] border border-line bg-muted" /> —</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] border border-dashed border-line" /> {t("restDay")}</span>
      </div>
    </div>
  );
}
