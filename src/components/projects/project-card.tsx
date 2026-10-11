import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarDays, Flag } from "lucide-react";
import { Badge, ContextDot, ProgressBar } from "@/components/ui";
import { fmtShortDay, type Numerals } from "@/lib/format";
import type { ProjectCard as P } from "@/lib/queries/projects";

export const STATUS_TONE = { planned: "neutral", active: "primary", paused: "warning", completed: "success", cancelled: "neutral" } as const;

export function ProjectCard({ p, color, numerals }: { p: P; color?: string | null; numerals: Numerals }) {
  const t = useTranslations();
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <ContextDot color={color} />
            <span className="truncate">{p.name}</span>
          </p>
          {p.description && <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">{p.description}</p>}
        </div>
        <Badge tone={STATUS_TONE[p.status]}>{t(`project.${p.status}`)}</Badge>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-muted">
          <span>
            {p.progress.basis === "tasks"
              ? t("project.progressTasks", { done: p.progress.done, total: p.progress.total })
              : p.progress.basis === "milestones"
                ? t("project.progressMilestones", { done: p.progress.done, total: p.progress.total })
                : t("project.noSteps")}
          </span>
          {p.progress.pct !== null && <span className="font-medium text-ink">{p.progress.pct}%</span>}
        </div>
        <ProgressBar value={p.progress.pct} tone={p.status === "completed" ? "success" : "primary"} label={p.name} />
      </div>
      {(p.nextMilestone || p.target_date || p.attention.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          {p.nextMilestone && (
            <span className="inline-flex items-center gap-1">
              <Flag size={12} /> {p.nextMilestone.title}
              {p.nextMilestone.due_date && ` · ${fmtShortDay(p.nextMilestone.due_date, numerals)}`}
            </span>
          )}
          {p.target_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} /> {fmtShortDay(p.target_date, numerals)}
            </span>
          )}
          {p.attention.length > 0 && (
            <span className="inline-flex items-center gap-1 text-warning">
              <AlertTriangle size={12} />
              {p.attention
                .map((a) =>
                  a.kind === "stale" ? t("attention.stale", { days: a.days })
                  : a.kind === "overdue" ? t("attention.overdue", { count: a.count })
                  : t("attention.deadline", { days: a.days, pct: a.pct }),
                )
                .join(" · ")}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
