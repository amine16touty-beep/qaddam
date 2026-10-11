import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Flag, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { tasksQuery, type TaskRow } from "@/lib/queries/tasks";
import { addDays, addMonths, dayStartUtc, daysInRange, startOfMonth, startOfWeek } from "@/lib/domain/dates";
import { fmtDay, fmtMonth, fmtNum, fmtShortDay, fmtTime, weekdayNames } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { TaskItem } from "@/components/tasks/task-item";
import { SectionTabs } from "@/components/shell/section-tabs";
import { CaptureButton } from "@/components/shell/capture-button";
import { cn } from "@/lib/utils";

export const metadata = { title: "التقويم" };

type View = "day" | "week" | "month";
type Item =
  | { kind: "meeting"; id: string; title: string; day: string; time: string; at: string }
  | { kind: "task"; task: TaskRow; day: string; time: string | null }
  | { kind: "milestone"; id: string; title: string; day: string; done: boolean; project: { id: string; name: string } | null };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; d?: string }> }) {
  const s = await getSession();
  const t = await getTranslations();
  const sp = await searchParams;
  const view: View = sp.view === "day" || sp.view === "month" ? sp.view : "week";
  const anchor = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : s.today;

  let from: string, to: string;
  if (view === "day") { from = anchor; to = anchor; }
  else if (view === "week") { from = startOfWeek(anchor, s.weekStart); to = addDays(from, 6); }
  else { from = startOfWeek(startOfMonth(anchor), s.weekStart); to = addDays(startOfWeek(addDays(addMonths(anchor, 1), -1), s.weekStart), 6); }

  const fromUtc = dayStartUtc(from, s.tz).toISOString();
  const toUtc = dayStartUtc(addDays(to, 1), s.tz).toISOString();

  let mq = s.supabase.from("meetings").select("id, title, starts_at").is("deleted_at", null).gte("starts_at", fromUtc).lt("starts_at", toUtc).order("starts_at");
  if (s.contextFilter) mq = mq.eq("context_id", s.contextFilter);
  let msq = s.supabase.from("milestones").select("id, title, due_date, completed_at, project:projects!inner(id, name, context_id, deleted_at)").gte("due_date", from).lte("due_date", to).is("project.deleted_at", null);
  if (s.contextFilter) msq = msq.eq("project.context_id", s.contextFilter);

  const [{ data: meetings }, { data: tasks }, { data: milestones }] = await Promise.all([
    mq,
    tasksQuery(s).neq("status", "cancelled").gte("due_date", from).lte("due_date", to).limit(1000),
    msq,
  ]);

  const items: Item[] = [
    ...(meetings ?? []).map((m) => ({ kind: "meeting" as const, id: m.id, title: m.title, at: m.starts_at, day: formatInTimeZone(new Date(m.starts_at), s.tz, "yyyy-MM-dd"), time: formatInTimeZone(new Date(m.starts_at), s.tz, "HH:mm") })),
    ...((tasks ?? []) as unknown as TaskRow[]).map((x) => ({ kind: "task" as const, task: x, day: x.due_date!, time: x.due_time?.slice(0, 5) ?? null })),
    ...(milestones ?? []).map((m) => ({ kind: "milestone" as const, id: m.id, title: m.title, day: m.due_date!, done: !!m.completed_at, project: m.project as { id: string; name: string } | null })),
  ];
  const byDay = (d: string) =>
    items
      .filter((i) => i.day === d)
      .sort((a, b) => ((a.kind === "milestone" ? "" : a.time ?? "99") || "").localeCompare((b.kind === "milestone" ? "" : b.time ?? "99") || ""));

  const step = view === "day" ? (n: number) => addDays(anchor, n) : view === "week" ? (n: number) => addDays(anchor, 7 * n) : (n: number) => addMonths(anchor, n);
  const href = (v: View, d: string) => `/calendar?view=${v}&d=${d}`;
  const title =
    view === "day" ? fmtDay(anchor, s.numerals)
    : view === "week" ? `${fmtShortDay(from, s.numerals)} – ${fmtShortDay(to, s.numerals)}`
    : fmtMonth(anchor, s.numerals);
  const names = weekdayNames(s.numerals, "short");

  return (
    <div>
      <SectionTabs active="calendar" items={[{ key: "calendar", href: "/calendar", label: t("nav.calendar") }, { key: "fu", href: "/calendar/follow-ups", label: t("calendar.followUps") }]} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Link href={href(view, step(-1))} aria-label={t("calendar.prev")} className="rounded-lg p-2 text-ink-muted hover:bg-muted"><ChevronRight size={18} /></Link>
          <Link href={href(view, step(1))} aria-label={t("calendar.next")} className="rounded-lg p-2 text-ink-muted hover:bg-muted"><ChevronLeft size={18} /></Link>
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {anchor !== s.today && <Link href={href(view, s.today)} className="rounded-lg border border-line px-3 py-1 text-sm hover:bg-muted">{t("calendar.today")}</Link>}
        <div className="ms-auto inline-flex rounded-xl bg-muted p-1">
          {(["day", "week", "month"] as const).map((v) => (
            <Link key={v} href={href(v, anchor)} aria-current={v === view ? "page" : undefined} className={cn("rounded-lg px-3 py-1 text-sm", v === view ? "bg-surface font-medium shadow-sm" : "text-ink-muted")}>
              {t(`calendar.${v}`)}
            </Link>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line bg-muted/50 text-center text-xs text-ink-muted">
            {Array.from({ length: 7 }, (_, i) => <div key={i} className="py-2">{names[(s.weekStart + i) % 7]}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {daysInRange(from, to).map((d) => {
              const its = byDay(d);
              const inMonth = d.slice(0, 7) === anchor.slice(0, 7);
              return (
                <Link
                  key={d}
                  href={href("day", d)}
                  className={cn("min-h-16 border-b border-e border-line p-1.5 text-start hover:bg-muted/50 sm:min-h-24", !inMonth && "bg-muted/30 text-ink-muted/60")}
                >
                  <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", d === s.today && "bg-primary text-on-primary font-semibold")}>
                    {fmtNum(Number(d.slice(8)), s.numerals)}
                  </span>
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {its.slice(0, 3).map((i, k) => (
                      <p key={k} className={cn("truncate rounded px-1 text-[11px]", i.kind === "meeting" ? "bg-primary-soft text-primary" : i.kind === "milestone" ? "bg-warning-soft text-warning" : i.task.status === "done" ? "text-ink-muted line-through" : "text-ink")}>
                        {i.kind === "task" ? i.task.title : i.title}
                      </p>
                    ))}
                    {its.length > 3 && <p className="px-1 text-[11px] text-ink-muted">{t("calendar.moreItems", { n: its.length - 3 })}</p>}
                  </div>
                  <div className="mt-1 flex gap-0.5 sm:hidden">
                    {its.slice(0, 4).map((i, k) => (
                      <span key={k} className={cn("h-1.5 w-1.5 rounded-full", i.kind === "meeting" ? "bg-primary" : i.kind === "milestone" ? "bg-warning" : "bg-ink-muted")} />
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className={cn(view === "week" && "grid gap-3 lg:grid-cols-7")}>
          {daysInRange(from, to).map((d) => {
            const its = byDay(d);
            if (view === "week" && its.length === 0) {
              return (
                <div key={d} className="hidden rounded-[var(--radius-card)] border border-dashed border-line p-2 lg:block">
                  <DayTitle d={d} today={s.today} numerals={s.numerals} href={href("day", d)} />
                </div>
              );
            }
            return (
              <Card key={d} className={cn("p-2", d === s.today && "border-primary/40")}>
                {view === "week" && <DayTitle d={d} today={s.today} numerals={s.numerals} href={href("day", d)} />}
                {its.length === 0 ? (
                  <EmptyState title={t("calendar.empty")} className="py-6" action={<CaptureButton preset={{ type: "meeting", starts_at_day: d }} label={t("meeting.new")} />} />
                ) : (
                  <div>
                    {its.map((i) =>
                      i.kind === "meeting" ? (
                        <Link key={i.id} href={`/meetings/${i.id}`} className="flex items-start gap-2 rounded-xl bg-primary-soft/60 px-2 py-2 my-1 text-sm hover:bg-primary-soft">
                          <Users size={15} className="mt-0.5 shrink-0 text-primary" />
                          <span className="min-w-0"><span className="block font-medium text-primary" dir="ltr">{fmtTime(i.at, s.tz, s.numerals)}</span><span className="block">{i.title}</span></span>
                        </Link>
                      ) : i.kind === "milestone" ? (
                        <Link key={i.id} href={i.project ? `/projects/${i.project.id}` : "#"} className="my-1 flex items-start gap-2 rounded-xl bg-warning-soft/70 px-2 py-2 text-sm">
                          <Flag size={15} className="mt-0.5 shrink-0 text-warning" />
                          <span className={cn("min-w-0", i.done && "line-through opacity-70")}>{i.title}{i.project && <span className="block text-xs text-ink-muted">{i.project.name}</span>}</span>
                        </Link>
                      ) : (
                        <TaskItem key={i.task.id} task={i.task} compact={view === "week"} />
                      ),
                    )}
                  </div>
                )}
              </Card>
            );
          })}
          {view === "week" && items.length === 0 && (
            <Card className="lg:col-span-7"><EmptyState title={t("calendar.emptyRange")} action={<CaptureButton preset={{ type: "meeting" }} label={t("meeting.new")} />} /></Card>
          )}
        </div>
      )}
    </div>
  );
}

function DayTitle({ d, today, numerals, href }: { d: string; today: string; numerals: "latn" | "arab"; href: string }) {
  return (
    <Link href={href} className={cn("mb-1 block px-1 text-sm font-medium hover:text-primary", d === today ? "text-primary" : "text-ink-muted")}>
      {fmtDay(d, numerals, { weekday: "short", day: "numeric", month: "short" })}
    </Link>
  );
}
