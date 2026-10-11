import { getTranslations } from "next-intl/server";
import { CircleCheckBig } from "lucide-react";
import { getSession } from "@/lib/session";
import { sortTasks, tasksQuery, type TaskRow } from "@/lib/queries/tasks";
import { dueBucket } from "@/lib/domain/progress";
import { Card, EmptyState } from "@/components/ui";
import { TaskItem } from "@/components/tasks/task-item";
import { SectionTabs } from "@/components/shell/section-tabs";
import { cn } from "@/lib/utils";

export const metadata = { title: "المتابعات" };

/** Follow-ups = open tasks that wait on someone (kind follow_up) or came out of a meeting. */
export default async function FollowUpsPage() {
  const s = await getSession();
  const t = await getTranslations();
  const { data } = await tasksQuery(s).eq("status", "todo").or("kind.eq.follow_up,meeting_id.not.is.null").limit(500);
  const rows = sortTasks((data ?? []) as unknown as TaskRow[]);
  const groups = [
    { key: "overdue", label: t("calendar.fuOverdue"), tone: "text-danger", items: rows.filter((r) => dueBucket(r.due_date, s.today) === "overdue") },
    { key: "today", label: t("calendar.fuToday"), tone: "text-primary", items: rows.filter((r) => dueBucket(r.due_date, s.today) === "today") },
    { key: "soon", label: t("calendar.fuSoon"), tone: "text-ink", items: rows.filter((r) => ["soon", "later"].includes(dueBucket(r.due_date, s.today))) },
    { key: "none", label: t("calendar.fuNoDate"), tone: "text-ink-muted", items: rows.filter((r) => !r.due_date) },
  ];
  return (
    <div>
      <SectionTabs active="fu" items={[{ key: "calendar", href: "/calendar", label: t("nav.calendar") }, { key: "fu", href: "/calendar/follow-ups", label: t("calendar.followUps") }]} />
      <p className="mb-5 text-sm text-ink-muted">{t("calendar.fuIntro")}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.slice(0, 3).map((g) => (
          <Card key={g.key}>
            <h2 className={cn("px-4 pt-3 pb-1 text-sm font-semibold", g.tone)}>{g.label} ({g.items.length})</h2>
            <div className="px-2 pb-2">
              {g.items.length ? g.items.map((x) => <TaskItem key={x.id} task={x} />) : <EmptyState icon={<CircleCheckBig size={24} />} title={t("calendar.fuEmpty")} className="py-5" />}
            </div>
          </Card>
        ))}
      </div>
      {groups[3].items.length > 0 && (
        <Card className="mt-4">
          <h2 className="px-4 pt-3 pb-1 text-sm font-semibold text-ink-muted">{groups[3].label} ({groups[3].items.length})</h2>
          <div className="px-2 pb-2">{groups[3].items.map((x) => <TaskItem key={x.id} task={x} />)}</div>
        </Card>
      )}
    </div>
  );
}
