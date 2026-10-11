import "server-only";
import type { Session } from "@/lib/session";

export const TASK_SELECT =
  "id, title, notes, kind, status, priority, due_date, due_time, priority_date, owner_text, context_id, project_id, milestone_id, meeting_id, decision_id, completed_at, created_at, project:projects(id, name), meeting:meetings(id, title)";

export type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  kind: "task" | "follow_up";
  status: "todo" | "done" | "cancelled";
  priority: "none" | "low" | "medium" | "high";
  due_date: string | null;
  due_time: string | null;
  priority_date: string | null;
  owner_text: string | null;
  context_id: string | null;
  project_id: string | null;
  milestone_id: string | null;
  meeting_id: string | null;
  decision_id: string | null;
  completed_at: string | null;
  created_at: string;
  project: { id: string; name: string } | null;
  meeting: { id: string; title: string } | null;
};

/** Base query for live tasks, honouring the global context filter. */
export function tasksQuery(s: Session) {
  let q = s.supabase.from("tasks").select(TASK_SELECT).is("deleted_at", null);
  if (s.contextFilter) q = q.eq("context_id", s.contextFilter);
  return q;
}

export function sortTasks(rows: TaskRow[]) {
  const pr = { high: 0, medium: 1, low: 2, none: 3 };
  return [...rows].sort(
    (a, b) =>
      (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      pr[a.priority] - pr[b.priority] ||
      (a.due_time ?? "99").localeCompare(b.due_time ?? "99") ||
      a.created_at.localeCompare(b.created_at),
  );
}
