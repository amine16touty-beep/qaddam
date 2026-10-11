import "server-only";
import type { Session } from "@/lib/session";
import { todayIn } from "@/lib/domain/dates";
import { attentionReasons, projectProgress, type AttentionReason, type ProgressResult } from "@/lib/domain/progress";

export type ProjectCard = {
  id: string;
  name: string;
  description: string | null;
  status: "planned" | "active" | "paused" | "completed" | "cancelled";
  context_id: string | null;
  program_id: string | null;
  goal_id: string | null;
  target_date: string | null;
  start_date: string | null;
  last_activity_at: string;
  progress: ProgressResult;
  attention: AttentionReason[];
  nextMilestone: { title: string; due_date: string | null } | null;
  openTasks: number;
};

export async function loadProjects(s: Session, opts: { ids?: string[]; programId?: string; ignoreContext?: boolean } = {}) {
  let q = s.supabase
    .from("projects")
    .select("id, name, description, status, context_id, program_id, goal_id, target_date, start_date, last_activity_at")
    .is("deleted_at", null)
    .order("last_activity_at", { ascending: false });
  if (s.contextFilter && !opts.ignoreContext) q = q.eq("context_id", s.contextFilter);
  if (opts.ids) q = q.in("id", opts.ids);
  if (opts.programId) q = q.eq("program_id", opts.programId);
  const { data: projects } = await q;
  if (!projects?.length) return [] as ProjectCard[];

  const ids = projects.map((p) => p.id);
  const [{ data: tasks }, { data: milestones }] = await Promise.all([
    s.supabase.from("tasks").select("project_id, status, due_date").in("project_id", ids).is("deleted_at", null).limit(10000),
    s.supabase.from("milestones").select("project_id, title, due_date, completed_at, position").in("project_id", ids).order("position"),
  ]);

  return projects.map((p) => {
    const pt = (tasks ?? []).filter((t) => t.project_id === p.id);
    const pm = (milestones ?? []).filter((m) => m.project_id === p.id);
    const progress = projectProgress(pt, pm);
    const overdueTasks = pt.filter((t) => t.status === "todo" && t.due_date && t.due_date < s.today).length;
    const overdueMilestones = pm.filter((m) => !m.completed_at && m.due_date && m.due_date < s.today).length;
    const next = pm.filter((m) => !m.completed_at).sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0];
    return {
      ...p,
      progress,
      attention: attentionReasons({
        status: p.status,
        lastActivityDay: todayIn(s.tz, new Date(p.last_activity_at)),
        targetDate: p.target_date,
        today: s.today,
        overdueCount: overdueTasks + overdueMilestones,
        progress,
      }),
      nextMilestone: next ? { title: next.title, due_date: next.due_date } : null,
      openTasks: pt.filter((t) => t.status === "todo").length,
    } as ProjectCard;
  });
}
