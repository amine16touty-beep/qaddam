import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ListTodo, NotebookPen } from "lucide-react";
import { getSession } from "@/lib/session";
import { sortTasks, tasksQuery, type TaskRow } from "@/lib/queries/tasks";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { TaskItem } from "@/components/tasks/task-item";
import { dueBucket } from "@/lib/domain/progress";
import { cn } from "@/lib/utils";
import { AddTaskButton } from "../today/today-client";

export const metadata = { title: "كل المهام" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string; open?: string; kind?: string }> }) {
  const s = await getSession();
  const t = await getTranslations();
  const sp = await searchParams;
  const status = sp.status === "done" ? "done" : sp.status === "all" ? "all" : "open";

  let q = tasksQuery(s);
  if (status === "open") q = q.eq("status", "todo");
  if (status === "done") q = q.eq("status", "done").order("completed_at", { ascending: false });
  if (sp.kind === "follow_up") q = q.eq("kind", "follow_up");
  const { data } = await q.limit(500);
  let rows = (data ?? []) as unknown as TaskRow[];

  // a task opened from search must be visible even if filtered out
  if (sp.open && !rows.some((r) => r.id === sp.open)) {
    const { data: one } = await s.supabase.from("tasks").select((await import("@/lib/queries/tasks")).TASK_SELECT).eq("id", sp.open).is("deleted_at", null).maybeSingle();
    if (one) rows = [one as unknown as TaskRow, ...rows];
  }

  const groups =
    status === "done"
      ? [{ key: "done", label: t("task.filterDone"), items: rows }]
      : (() => {
          const sorted = sortTasks(rows);
          const by = (b: string) => sorted.filter((x) => x.status === "todo" && dueBucket(x.due_date, s.today) === b);
          return [
            { key: "overdue", label: t("today.overdue"), items: by("overdue"), tone: "danger" },
            { key: "today", label: t("task.today"), items: by("today") },
            { key: "soon", label: t("task.upcoming"), items: [...by("soon"), ...by("later")] },
            { key: "none", label: t("task.noDateGroup"), items: by("none") },
            { key: "closed", label: t("task.filterDone"), items: sorted.filter((x) => x.status !== "todo") },
          ];
        })();

  const tab = (v: string, label: string) => (
    <Link
      href={v === "open" ? "/tasks" : `/tasks?status=${v}`}
      aria-current={status === v ? "page" : undefined}
      className={cn("rounded-lg px-3 py-1.5 text-sm", status === v ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink")}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <PageHeader
        title={t("task.allTasksTitle")}
        actions={
          <>
            <Link href="/notes" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-muted">
              <NotebookPen size={16} /> {t("note.inbox")}
            </Link>
            <AddTaskButton label={t("capture.task")} />
          </>
        }
      />
      <div className="mb-4 inline-flex rounded-xl bg-muted p-1">
        {tab("open", t("task.filterOpen"))}
        {tab("done", t("task.filterDone"))}
        {tab("all", t("task.filterAll"))}
      </div>
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<ListTodo size={32} />} title={t("task.empty")} action={<AddTaskButton label={t("capture.task")} />} />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <Card key={g.key}>
                <h2 className={cn("px-4 pt-3 pb-1 text-sm font-semibold", "tone" in g && g.tone === "danger" ? "text-danger" : "text-ink-muted")}>
                  {g.label} <span className="font-normal">({g.items.length})</span>
                </h2>
                <div className="px-2 pb-2">
                  {g.items.map((task) => (
                    <TaskItem key={task.id} task={task} showStar autoOpen={sp.open === task.id} />
                  ))}
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
