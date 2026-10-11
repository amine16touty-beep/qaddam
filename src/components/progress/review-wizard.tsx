"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarArrowDown, CheckCircle2, Flag, Repeat, X } from "lucide-react";
import { Button, Card, Input, ProgressBar, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { moveTasks, setTaskStatus } from "@/app/actions/tasks";
import { saveWeeklyReview } from "@/app/actions/settings";
import type { TaskRow } from "@/lib/queries/tasks";

export function ReviewWizard({
  nextWeekStart,
  done,
  late,
  milestones,
  habits,
  initial,
}: {
  nextWeekStart: string;
  done: TaskRow[];
  late: TaskRow[];
  milestones: { id: string; title: string }[];
  habits: { id: string; name: string; done: number; target: number }[];
  initial: { focus: string[]; reflection: string };
}) {
  const t = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [handled, setHandled] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();
  const [focus, setFocus] = useState<string[]>([0, 1, 2].map((i) => initial.focus[i] ?? ""));
  const [reflection, setReflection] = useState(initial.reflection);
  const steps = [t("review.step1"), t("review.step2"), t("review.step3")];

  const act = (id: string, label: string, fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      setHandled((h) => ({ ...h, [id]: label }));
    });

  return (
    <div>
      <ol className="mb-5 flex gap-2" aria-label={t("review.title")}>
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <button
              onClick={() => setStep(i)}
              aria-current={step === i ? "step" : undefined}
              className={cn("w-full border-t-[3px] pt-2 text-start text-sm", i <= step ? "border-primary font-medium text-primary" : "border-line text-ink-muted")}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="animate-in space-y-5 p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-3xl font-semibold text-success">{done.length}</p><p className="text-xs text-ink-muted">{t("project.tasks")}</p></div>
            <div><p className="text-3xl font-semibold text-warning">{milestones.length}</p><p className="text-xs text-ink-muted">{t("project.milestones")}</p></div>
            <div><p className="text-3xl font-semibold text-primary">{habits.reduce((a, h) => a + Math.min(h.done, h.target), 0)}</p><p className="text-xs text-ink-muted">{t("habit.habits")}</p></div>
          </div>
          {done.length > 0 && (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto text-sm">
              {done.map((x) => <li key={x.id} className="flex items-center gap-2"><CheckCircle2 size={15} className="shrink-0 text-success" /> {x.title}</li>)}
              {milestones.map((m) => <li key={m.id} className="flex items-center gap-2"><Flag size={15} className="shrink-0 text-warning" /> {m.title}</li>)}
            </ul>
          )}
          {habits.length > 0 && (
            <div className="space-y-2">
              {habits.map((h) => (
                <div key={h.id}>
                  <div className="mb-1 flex justify-between text-sm"><span className="flex items-center gap-1.5"><Repeat size={14} className="text-ink-muted" />{h.name}</span><span className="text-ink-muted">{h.done}/{h.target}</span></div>
                  <ProgressBar value={h.target ? Math.min(100, Math.round((h.done / h.target) * 100)) : 0} tone="success" label={h.name} />
                </div>
              ))}
            </div>
          )}
          {done.length === 0 && milestones.length === 0 && <p className="text-sm text-ink-muted">{t("progress.noAchievements")}</p>}
          <div className="flex justify-end"><Button onClick={() => setStep(1)}>{t("review.next")}</Button></div>
        </Card>
      )}

      {step === 1 && (
        <Card className="animate-in p-3">
          {late.length === 0 ? (
            <p className="p-4 text-center text-sm text-ink-muted">{t("review.nothingLate")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {late.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-2 px-2 py-3">
                  <span className={cn("min-w-0 flex-1 text-[15px]", handled[x.id] && "text-ink-muted line-through")}>{x.title}</span>
                  {handled[x.id] ? (
                    <span className="text-xs text-ink-muted">{handled[x.id]}</span>
                  ) : (
                    <span className="flex gap-1">
                      <Button size="sm" variant="soft" disabled={pending} onClick={() => act(x.id, t("review.moved"), () => moveTasks([x.id], nextWeekStart))}>
                        <CalendarArrowDown size={14} /> {t("task.moveNextWeek")}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(x.id, t("task.cancelled"), () => setTaskStatus(x.id, "cancelled"))}>
                        <X size={14} /> {t("task.cancelTask")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setHandled((h) => ({ ...h, [x.id]: t("task.keep") }))}>{t("task.keep")}</Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between p-2">
            <Button variant="ghost" onClick={() => setStep(0)}>{t("review.prev")}</Button>
            <Button onClick={() => setStep(2)}>{t("review.next")}</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-in space-y-4 p-5">
          {focus.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{i + 1}</span>
              <Input value={f} maxLength={200} onChange={(e) => setFocus((x) => x.map((y, j) => (j === i ? e.target.value : y)))} placeholder={t("review.focusPlaceholder", { n: i + 1 })} aria-label={t("review.focusPlaceholder", { n: i + 1 })} />
            </div>
          ))}
          <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder={t("review.reflectionPlaceholder")} aria-label={t("review.reflection")} />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>{t("review.prev")}</Button>
            <Button
              disabled={saving}
              onClick={() =>
                startSave(async () => {
                  const r = await saveWeeklyReview(nextWeekStart, focus, reflection);
                  if (!r.ok) return void toast.error(r.error);
                  toast.success(t("review.savedReview"));
                  router.push("/progress");
                })
              }
            >
              {t("review.saveReview")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
