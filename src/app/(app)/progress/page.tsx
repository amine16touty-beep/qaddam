import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, CheckCircle2, Flag, PauseCircle, Repeat, Sparkles } from "lucide-react";
import { getContexts, getSession } from "@/lib/session";
import { loadHabits } from "@/lib/queries/habits";
import { loadProjects } from "@/lib/queries/projects";
import { addDays, dayStartUtc, startOfWeek } from "@/lib/domain/dates";
import { regularity } from "@/lib/domain/habits";
import { pct } from "@/lib/domain/progress";
import { fmtShortDay } from "@/lib/format";
import { buttonClass, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { HelpTip } from "@/components/ui/help-tip";
import { ProjectCard } from "@/components/projects/project-card";
import { Goals } from "@/components/progress/goals";
import { Collapsible } from "../today/today-client";

export const metadata = { title: "تقدّمي" };

export default async function ProgressPage() {
  const s = await getSession();
  const t = await getTranslations();
  const ws = startOfWeek(s.today, s.weekStart);
  const lastWs = addDays(ws, -7);
  const trendFrom = addDays(ws, -7 * 7);

  const ctx = <Q extends { eq: (c: string, v: string) => Q }>(q: Q) => (s.contextFilter ? q.eq("context_id", s.contextFilter) : q);

  const [{ data: dueTasks }, { data: completed }, { data: milestonesDone }, { habits, logs, rows }, projects, contexts, { data: goals }] = await Promise.all([
    ctx(s.supabase.from("tasks").select("id, status, due_date").is("deleted_at", null).neq("status", "cancelled").gte("due_date", lastWs).lte("due_date", addDays(ws, 6))),
    ctx(s.supabase.from("tasks").select("id, title, completed_at").is("deleted_at", null).eq("status", "done").gte("completed_at", dayStartUtc(trendFrom, s.tz).toISOString()).order("completed_at", { ascending: false }).limit(2000)),
    s.supabase.from("milestones").select("id, title, completed_at, project:projects!inner(context_id, deleted_at)").gte("completed_at", dayStartUtc(ws, s.tz).toISOString()).is("project.deleted_at", null),
    loadHabits(s),
    loadProjects(s),
    getContexts(),
    s.supabase.from("goals").select("id, title, status, target_date").is("deleted_at", null).order("created_at"),
  ]);

  // tasks: done ÷ due (this week vs last week)
  const inWeek = (d: string | null, start: string) => !!d && d >= start && d <= addDays(start, 6);
  const thisDue = (dueTasks ?? []).filter((x) => inWeek(x.due_date, ws));
  const lastDue = (dueTasks ?? []).filter((x) => inWeek(x.due_date, lastWs));
  const taskRate = { done: thisDue.filter((x) => x.status === "done").length, total: thisDue.length };
  const lastRate = pct(lastDue.filter((x) => x.status === "done").length, lastDue.length);

  // habits: average regularity over 4 weeks
  const regs = rows.map((h) => regularity(h, logs.get(h.id)!, addDays(s.today, -27), s.today, s.today, s.weekStart)).filter((r) => r.total > 0);
  const habitRate = regs.length ? Math.round(regs.reduce((a, r) => a + (r.pct ?? 0), 0) / regs.length) : null;

  // trend: completed tasks per week (8 weeks)
  const localDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: s.tz }).format(new Date(iso));
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(trendFrom, 7 * i));
  const trend = weeks.map((w) => ({ w, n: (completed ?? []).filter((c) => { const d = localDay(c.completed_at!); return d >= w && d <= addDays(w, 6); }).length }));
  const max = Math.max(1, ...trend.map((x) => x.n));

  const doneThisWeek = (completed ?? []).filter((c) => localDay(c.completed_at!) >= ws);
  const habitChecks = habits.reduce((a, h) => a + [...(logs.get(h.id)?.keys() ?? [])].filter((d) => d >= ws && d <= s.today).length, 0);
  const ms = (milestonesDone ?? []).filter((m) => !s.contextFilter || (m.project as { context_id: string | null }).context_id === s.contextFilter);

  const active = projects.filter((p) => p.status === "active");
  const stalled = active.filter((p) => p.attention.some((a) => a.kind === "stale"));
  const color = (id: string | null) => contexts.find((c) => c.id === id)?.color;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("progress.title")}
        subtitle={`${t("progress.thisWeek")}: ${fmtShortDay(ws, s.numerals)} – ${fmtShortDay(addDays(ws, 6), s.numerals)}`}
        actions={<Link href="/progress/review" className={buttonClass("primary", "md")}><Sparkles size={16} /> {t("progress.reviewCta")}</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="flex items-center gap-1 text-sm text-ink-muted">{t("progress.tasksRate")} <HelpTip text={t("progress.tasksRateHelp")} /></p>
          <p className="mt-1 text-3xl font-semibold">{taskRate.total ? `${pct(taskRate.done, taskRate.total)}%` : "—"}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {taskRate.total ? `${taskRate.done} / ${taskRate.total}` : t("progress.noData")} · {t("progress.vsLast", { value: lastRate === null ? "—" : `${lastRate}%` })}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1 text-sm text-ink-muted">{t("progress.habitsRate")} <HelpTip text={t("progress.habitsRateHelp")} /></p>
          <p className="mt-1 text-3xl font-semibold">{habitRate === null ? "—" : `${habitRate}%`}</p>
          <Link href="/progress/habits" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"><Repeat size={12} /> {t("progress.manageHabits")}</Link>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("progress.achievements")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-success" /> {t("progress.completedTasks", { count: doneThisWeek.length })}</li>
            <li className="flex items-center gap-2"><Flag size={15} className="text-warning" /> {ms.length ? t("progress.completedMilestones", { count: ms.length }) : "—"}</li>
            <li className="flex items-center gap-2"><Repeat size={15} className="text-primary" /> {habitChecks ? t("progress.habitChecks", { count: habitChecks }) : "—"}</li>
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title={<span className="flex items-center gap-1">{t("progress.trend")} <HelpTip text={t("progress.trendHelp")} /></span>} />
        <div className="px-4 pb-4">
          <div className="flex h-36 items-end gap-2" role="img" aria-label={trend.map((x) => `${t("progress.weekLabel", { date: fmtShortDay(x.w, s.numerals) })}: ${x.n}`).join("، ")}>
            {trend.map((x) => (
              <div key={x.w} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-ink-muted">{x.n || ""}</span>
                <div className={x.w === ws ? "w-full rounded-t-md bg-primary" : "w-full rounded-t-md bg-primary/30"} style={{ height: `${Math.max(2, (x.n / max) * 100)}px` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2 text-center text-[10px] text-ink-muted">
            {trend.map((x) => <span key={x.w} className="flex-1 truncate">{fmtShortDay(x.w, s.numerals)}</span>)}
          </div>
          {doneThisWeek.length > 0 && (
            <Collapsible label={`${t("progress.achievements")} (${doneThisWeek.length})`}>
              <ul className="space-y-1 px-2 text-sm">
                {doneThisWeek.slice(0, 30).map((c) => <li key={c.id} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> {c.title}</li>)}
              </ul>
            </Collapsible>
          )}
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">{t("progress.projectsTitle")}</h2>
        {active.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((p) => <ProjectCard key={p.id} p={p} color={color(p.context_id)} numerals={s.numerals} />)}
          </div>
        ) : (
          <Card><EmptyState title={t("project.empty")} className="py-6" /></Card>
        )}
      </section>

      <Card>
        <CardHeader title={<span className="flex items-center gap-1.5"><PauseCircle size={17} className="text-warning" /> {t("progress.stalled")} <HelpTip text={t("progress.stalledHelp")} /></span>} />
        <div className="px-2 pb-2">
          {stalled.length ? stalled.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between rounded-xl px-2 py-2.5 hover:bg-muted/60">
              <span>{p.name}</span>
              <span className="flex items-center gap-1 text-xs text-warning">{t("attention.stale", { days: (p.attention.find((a) => a.kind === "stale") as { days: number }).days })} <ArrowLeft size={13} /></span>
            </Link>
          )) : <p className="px-2 pb-2 text-sm text-ink-muted">{t("progress.noStalled")}</p>}
        </div>
      </Card>

      <Goals goals={(goals ?? []) as never} projects={projects.map((p) => ({ goal_id: p.goal_id }))} habits={rows.map((h) => ({ goal_id: h.goal_id }))} />
    </div>
  );
}
