"use client";
import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, CalendarDays, Flag, FolderKanban, Star, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { diffDays } from "@/lib/domain/dates";
import { fmtShortDay } from "@/lib/format";
import { setTaskPriority, setTaskStatus } from "@/app/actions/tasks";
import { useShell } from "@/components/shell/shell-context";
import type { TaskRow } from "@/lib/queries/tasks";
import { TaskDetail } from "./task-detail";

export function CheckCircle({ checked, onClick, label, size = "md" }: { checked: boolean; onClick: () => void; label: string; size?: "md" | "lg" }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className="-m-2 flex shrink-0 items-center justify-center p-2"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full border-[1.5px] transition-colors",
          size === "lg" ? "h-7 w-7" : "h-[22px] w-[22px]",
          checked ? "border-success bg-success text-white" : "border-ink-muted/50 hover:border-primary hover:bg-primary-soft",
        )}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="check-draw h-3.5 w-3.5" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

export function useDueLabel() {
  const t = useTranslations();
  const { data } = useShell();
  return (due: string | null) => {
    if (!due) return null;
    const d = diffDays(due, data.today);
    if (d === 0) return { text: t("task.today"), tone: "primary" as const };
    if (d === 1) return { text: t("task.tomorrow"), tone: "muted" as const };
    if (d < 0) return { text: t("attention.followUpLate", { days: -d }), tone: "danger" as const };
    return { text: fmtShortDay(due, data.numerals), tone: "muted" as const };
  };
}

export function TaskItem({
  task,
  showStar = false,
  showProject = true,
  compact = false,
  autoOpen = false,
}: {
  task: TaskRow;
  showStar?: boolean;
  showProject?: boolean;
  compact?: boolean;
  autoOpen?: boolean;
}) {
  const t = useTranslations();
  const { data } = useShell();
  const dueLabel = useDueLabel();
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(task, (cur, patch: Partial<TaskRow>) => ({ ...cur, ...patch }));
  const [open, setOpen] = useState(autoOpen);
  const done = optimistic.status === "done";
  const isPriority = optimistic.priority_date === data.today;
  const due = optimistic.status === "todo" ? dueLabel(optimistic.due_date) : null;

  function toggle() {
    const next = done ? "todo" : "done";
    start(async () => {
      setOptimistic({ status: next });
      if (next === "done" && navigator.vibrate) navigator.vibrate(10);
      const r = await setTaskStatus(task.id, next);
      if (!r.ok) return void toast.error(r.error);
      if (next === "done")
        toast.success(t("task.doneToast"), {
          action: { label: t("app.undo"), onClick: () => setTaskStatus(task.id, "todo") },
        });
    });
  }

  function star() {
    start(async () => {
      setOptimistic({ priority_date: isPriority ? null : data.today });
      const r = await setTaskPriority(task.id, isPriority ? null : data.today);
      if (!r.ok) toast.error(r.error);
    });
  }

  // Touch swipe: towards the reading end (left in RTL) completes, the other way stars it for today.
  const [dx, setDx] = useState(0);
  const touch = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);
  const THRESHOLD = 80;
  const canStar = showStar && optimistic.status === "todo";
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => {
      const p = e.touches[0];
      touch.current = { x: p.clientX, y: p.clientY, locked: null };
    },
    onTouchMove: (e: React.TouchEvent) => {
      const s = touch.current;
      if (!s) return;
      const p = e.touches[0];
      const mx = p.clientX - s.x;
      const my = p.clientY - s.y;
      if (s.locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my) * 1.2;
      if (!s.locked) return;
      const rtl = document.dir === "rtl";
      const toEnd = rtl ? mx < 0 : mx > 0;
      if (!toEnd && !canStar) return setDx(0);
      setDx(Math.max(-140, Math.min(140, mx)));
    },
    onTouchEnd: () => {
      const s = touch.current;
      touch.current = null;
      if (!s?.locked) return setDx(0);
      const rtl = document.dir === "rtl";
      const toEnd = rtl ? dx < 0 : dx > 0;
      if (Math.abs(dx) >= THRESHOLD) {
        if (navigator.vibrate) navigator.vibrate(12);
        if (toEnd) toggle();
        else if (canStar) star();
      }
      setDx(0);
    },
  };
  const rtlNow = typeof document !== "undefined" && document.dir === "rtl";
  const swipingToEnd = rtlNow ? dx < 0 : dx > 0;
  const armed = Math.abs(dx) >= THRESHOLD;

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
      {dx !== 0 && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center px-5 transition-colors",
            swipingToEnd ? "justify-end" : "justify-start",
            swipingToEnd ? (armed ? "bg-success text-white" : "bg-success-soft text-success") : armed ? "bg-warning text-white" : "bg-warning-soft text-warning",
          )}
        >
          {swipingToEnd ? <Check size={22} /> : <Star size={20} fill={armed ? "currentColor" : "none"} />}
        </div>
      )}
      <div
        {...swipe}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        className={cn(
          "group relative flex items-start gap-3 rounded-xl bg-surface px-2 transition-[background-color,transform] hover:bg-muted/60",
          dx !== 0 && "transition-none",
          compact ? "py-2" : "py-2.5",
          optimistic.status === "cancelled" && "opacity-50",
        )}
      >
        <div className="pt-0.5">
          <CheckCircle checked={done} onClick={toggle} label={done ? t("task.reopen") : t("task.complete")} />
        </div>
        <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 text-start">
          <span className={cn("block text-[15px] leading-6", done && "text-ink-muted line-through decoration-ink-muted/50")}>
            {optimistic.kind === "follow_up" && <Users size={14} className="me-1 inline align-[-2px] text-ink-muted" aria-label={t("task.kindFollowUp")} />}
            {optimistic.title}
          </span>
          {!compact && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
              {due && (
                <span className={cn("inline-flex items-center gap-1", due.tone === "danger" && "text-danger", due.tone === "primary" && "text-primary")}>
                  <CalendarDays size={12} /> {due.text}
                  {optimistic.due_time && <span dir="ltr">{optimistic.due_time.slice(0, 5)}</span>}
                </span>
              )}
              {optimistic.priority === "high" && (
                <span className="inline-flex items-center gap-1 text-warning"><Flag size={12} /> {t("task.priorityHigh")}</span>
              )}
              {optimistic.owner_text && (
                <span className="inline-flex items-center gap-1"><UserRound size={12} /> {optimistic.owner_text}</span>
              )}
              {showProject && task.project && (
                <span className="inline-flex items-center gap-1"><FolderKanban size={12} /> {task.project.name}</span>
              )}
              {task.meeting && (
                <span className="inline-flex items-center gap-1"><Users size={12} /> {t("task.fromMeeting", { title: task.meeting.title })}</span>
              )}
            </span>
          )}
        </button>
        {showStar && optimistic.status === "todo" && (
          <button
            type="button"
            onClick={star}
            aria-pressed={isPriority}
            aria-label={isPriority ? t("task.unmarkPriority") : t("task.markPriority")}
            title={isPriority ? t("task.unmarkPriority") : t("task.markPriority")}
            className={cn(
              "-m-1 shrink-0 rounded-lg p-2 transition-opacity",
              isPriority ? "text-warning" : "text-ink-muted/60 opacity-100 hover:text-warning desk:opacity-0 desk:group-hover:opacity-100 desk:focus:opacity-100",
            )}
          >
            <Star size={17} fill={isPriority ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      </div>
      {open && <TaskDetail task={task} onClose={() => setOpen(false)} />}
    </>
  );
}

export function TaskLink({ task }: { task: { id: string; title: string } }) {
  return <Link href={`/tasks?open=${task.id}`} className="text-primary hover:underline">{task.title}</Link>;
}
