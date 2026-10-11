import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowLeft, CalendarClock, ChevronLeft, Clock, FolderKanban, MapPin, Star, Target, Users, Video } from "lucide-react";
import { getSession } from "@/lib/session";
import { tasksQuery, sortTasks, type TaskRow } from "@/lib/queries/tasks";
import { loadHabits } from "@/lib/queries/habits";
import { loadProjects } from "@/lib/queries/projects";
import { dayStartUtc, diffDays, greetingKey, startOfWeek } from "@/lib/domain/dates";
import { fmtDay, fmtTime } from "@/lib/format";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { TaskItem } from "@/components/tasks/task-item";
import { HabitToggle } from "@/components/habits/habit-toggle";
import { AddTaskButton, Collapsible, SuggestPriority } from "./today-client";

export const metadata = { title: "الرئيسية" };

export default async function TodayPage() {
  const s = await getSession();
  const t = await getTranslations();
  const now = new Date().toISOString();
  const todayStartIso = dayStartUtc(s.today, s.tz).toISOString();

  const [{ data: openTasks }, { data: doneToday }, { habits }, projects, { data: meetings }, { data: review }] = await Promise.all([
    tasksQuery(s).eq("status", "todo").or(`due_date.lte.${s.today},priority_date.eq.${s.today}`).limit(300),
    tasksQuery(s).eq("status", "done").gte("completed_at", todayStartIso).limit(100),
    loadHabits(s),
    loadProjects(s),
    (() => {
      let q = s.supabase
        .from("meetings")
        .select("id, title, starts_at, ends_at, location, url, agenda, project:projects(name)")
        .is("deleted_at", null)
        .gte("starts_at", new Date(Date.now() - 2 * 3600_000).toISOString())
        .order("starts_at")
        .limit(5);
      if (s.contextFilter) q = q.eq("context_id", s.contextFilter);
      return q;
    })(),
    s.supabase.from("weekly_reviews").select("focus").eq("week_start", startOfWeek(s.today, s.weekStart)).maybeSingle(),
  ]);

  const open = (openTasks ?? []) as unknown as TaskRow[];
  const done = (doneToday ?? []) as unknown as TaskRow[];
  const priorities = sortTasks([...open, ...done].filter((x) => x.priority_date === s.today));
  const dueToday = sortTasks([...open.filter((x) => x.due_date === s.today && x.priority_date !== s.today), ...done.filter((x) => x.priority_date !== s.today)]);
  const overdue = sortTasks(open.filter((x) => x.due_date && x.due_date < s.today && x.priority_date !== s.today && x.kind === "task"));
  const lateFollowUps = sortTasks(open.filter((x) => x.due_date && x.due_date < s.today && x.kind === "follow_up"));
  const suggestions = priorities.length < 3 ? sortTasks([...open.filter((x) => x.priority_date !== s.today)]).slice(0, 3 - priorities.length) : [];

  const todayHabits = habits.filter((h) => h.showToday);
  const habitsDone = todayHabits.filter((h) => h.doneToday).length;
  const nextMeeting = (meetings ?? []).find((m) => (m.ends_at ?? new Date(new Date(m.starts_at).getTime() + 3600_000).toISOString()) >= now);
  const attentionProjects = projects.filter((p) => p.attention.length > 0).slice(0, 5);
  const focus = review?.focus ?? [];

  const tasksLeft = open.filter((x) => x.due_date === s.today || x.priority_date === s.today).length;
  const summary = [
    t("today.summaryTasks", { count: tasksLeft }),
    todayHabits.length ? t("today.summaryHabits", { done: habitsDone, total: todayHabits.length }) : null,
    nextMeeting && diffDays(fmtIsoDay(nextMeeting.starts_at, s.tz), s.today) === 0 ? t("today.summaryMeeting", { time: fmtTime(nextMeeting.starts_at, s.tz, s.numerals) }) : null,
    lateFollowUps.length ? t("today.summaryOverdue", { count: lateFollowUps.length }) : null,
  ].filter(Boolean);

  const name = s.profile?.display_name;
  return (
    <div className="space-y-5">
      <header className="pb-1">
        <h1 className="text-2xl font-semibold leading-tight sm:text-[28px]">
          {t(`greeting.${greetingKey(s.hour)}`)}{name ? `، ${name}` : ""}
        </h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          <span className="text-ink">{fmtDay(s.today, s.numerals)}</span>
          {summary.length > 0 && <span> · {summary.join(" · ")}</span>}
        </p>
      </header>

      {focus.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary-soft/60 px-4 py-2.5 text-sm">
          <Target size={16} className="text-primary" />
          <span className="font-medium text-primary">{t("today.weekFocus")}:</span>
          <span className="text-ink">{focus.join(" · ")}</span>
        </div>
      )}

      {/* Top 3 */}
      <Card className="border-primary/20">
        <CardHeader title={t("today.priorities")} icon={<Star size={17} className="text-warning" fill="currentColor" />} action={<span className="text-xs text-ink-muted">{priorities.length}/3</span>} />
        <div className="px-2 pb-2">
          {priorities.map((task) => (
            <TaskItem key={task.id} task={task} showStar />
          ))}
          {priorities.length === 0 && <p className="px-2 pt-1 pb-2 text-sm text-ink-muted">{t("today.prioritiesEmpty")}</p>}
          {suggestions.length > 0 && priorities.length < 3 && (
            <div className="mx-2 mt-1 mb-2 rounded-xl border border-dashed border-line p-2">
              <p className="px-1 pb-1 text-xs text-ink-muted">{t("today.suggested")}</p>
              {suggestions.map((task) => (
                <SuggestPriority key={task.id} id={task.id} title={task.title} />
              ))}
            </div>
          )}
          {priorities.length === 0 && suggestions.length === 0 && <p className="px-2 pb-2 text-xs text-ink-muted">{t("today.prioritiesHint")}</p>}
        </div>
      </Card>

      {/* Habits — horizontal on phones */}
      {todayHabits.length > 0 && (
        <section aria-labelledby="h-habits" className="lg:hidden">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 id="h-habits" className="text-[15px] font-semibold">{t("today.habits")}</h2>
            <span className="text-xs text-ink-muted">{habitsDone}/{todayHabits.length}</span>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {todayHabits.map((h) => (
              <HabitToggle key={h.id} habit={h} variant="chip" />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title={t("today.tasks")} action={<AddTaskButton label={t("today.addTask")} />} />
            <div className="px-2 pb-2">
              {dueToday.length === 0 && overdue.length === 0 ? (
                <EmptyState title={priorities.length && priorities.every((p) => p.status === "done") ? t("today.allDone") : t("today.tasksEmpty")} className="py-6" />
              ) : (
                dueToday.slice(0, 7).map((task) => <TaskItem key={task.id} task={task} showStar />)
              )}
              {dueToday.length > 7 && (
                <Collapsible label={`${t("app.showAll")} (${dueToday.length - 7})`}>
                  {dueToday.slice(7).map((task) => <TaskItem key={task.id} task={task} showStar />)}
                </Collapsible>
              )}
              {overdue.length > 0 && (
                <Collapsible label={`${t("today.overdue")} (${overdue.length})`} tone="danger">
                  {overdue.map((task) => <TaskItem key={task.id} task={task} showStar />)}
                </Collapsible>
              )}
              <Link href="/tasks" className="mt-1 flex items-center gap-1 px-2 py-2 text-sm text-ink-muted hover:text-primary">
                {t("today.allTasks")} <ChevronLeft size={15} />
              </Link>
            </div>
          </Card>

          {(lateFollowUps.length > 0 || attentionProjects.length > 0) && (
            <Card className="border-warning/25">
              <CardHeader title={t("today.attention")} icon={<AlertTriangle size={17} className="text-warning" />} />
              <div className="px-2 pb-2">
                {lateFollowUps.slice(0, 5).map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
                {attentionProjects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/60">
                    <FolderKanban size={18} className="mt-0.5 shrink-0 text-ink-muted" />
                    <span className="min-w-0">
                      <span className="block text-[15px]">{p.name}</span>
                      <span className="block text-xs text-warning">
                        {p.attention
                          .map((a) =>
                            a.kind === "stale" ? t("attention.stale", { days: a.days })
                            : a.kind === "overdue" ? t("attention.overdue", { count: a.count })
                            : t("attention.deadline", { days: a.days, pct: a.pct }),
                          )
                          .join(" · ")}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="hidden lg:block">
            <CardHeader title={t("today.habits")} action={todayHabits.length ? <span className="text-xs text-ink-muted">{habitsDone}/{todayHabits.length}</span> : null} />
            <div className="px-2 pb-2">
              {todayHabits.length ? (
                todayHabits.map((h) => <HabitToggle key={h.id} habit={h} />)
              ) : (
                <EmptyState
                  title={habits.length ? t("today.habitsEmpty") : t("habit.empty")}
                  className="py-5"
                  action={!habits.length ? <AddTaskButton label={t("today.habitsCreate")} type="habit" /> : undefined}
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("today.nextMeeting")} icon={<CalendarClock size={17} className="text-ink-muted" />} />
            {nextMeeting ? (
              <Link href={`/meetings/${nextMeeting.id}`} className="block px-4 pb-4 hover:opacity-90">
                <p className="font-medium">{nextMeeting.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} />
                    {diffDays(fmtIsoDay(nextMeeting.starts_at, s.tz), s.today) === 0
                      ? `${t("task.today")} ${fmtTime(nextMeeting.starts_at, s.tz, s.numerals)}`
                      : `${fmtDay(fmtIsoDay(nextMeeting.starts_at, s.tz), s.numerals, { weekday: "long", day: "numeric", month: "short" })} ${fmtTime(nextMeeting.starts_at, s.tz, s.numerals)}`}
                  </span>
                  {nextMeeting.location && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {nextMeeting.location}</span>}
                  {nextMeeting.url && <span className="inline-flex items-center gap-1"><Video size={14} /> {t("meeting.join")}</span>}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
                  <Users size={13} /> {t("today.agendaItems", { count: nextMeeting.agenda.split("\n").filter((l) => l.trim()).length })}
                  {nextMeeting.project && <> · {(nextMeeting.project as { name: string }).name}</>}
                  <ArrowLeft size={13} className="ms-auto text-primary" />
                </p>
              </Link>
            ) : (
              <EmptyState title={t("calendar.emptyRange")} className="py-5" action={<AddTaskButton label={t("meeting.new")} type="meeting" />} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function fmtIsoDay(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
