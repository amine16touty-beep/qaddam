import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarClock, Layers } from "lucide-react";
import { getContexts, getSession } from "@/lib/session";
import { TASK_SELECT, sortTasks, type TaskRow } from "@/lib/queries/tasks";
import { projectProgress } from "@/lib/domain/progress";
import { todayIn } from "@/lib/domain/dates";
import { fmtDateTime, fmtShortDay } from "@/lib/format";
import { Card, EmptyState, ProgressBar } from "@/components/ui";
import { HelpTip } from "@/components/ui/help-tip";
import { TaskItem } from "@/components/tasks/task-item";
import { NoteList } from "@/components/notes/note-list";
import { DeleteProject, Milestones, ProjectDetails, ProjectTaskAdd, ProjectTitle, Tabs } from "@/components/projects/project-client";
import { Collapsible } from "../../today/today-client";
import { CaptureButton } from "@/components/shell/capture-button";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const s = await getSession();
  const t = await getTranslations();

  const { data: project } = await s.supabase.from("projects").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!project) notFound();

  const [contexts, { data: programs }, { data: goals }, { data: tasks }, { data: milestones }, { data: meetings }, { data: notes }] = await Promise.all([
    getContexts(),
    s.supabase.from("programs").select("id, name").is("deleted_at", null),
    s.supabase.from("goals").select("id, title").is("deleted_at", null).eq("status", "active"),
    s.supabase.from("tasks").select(TASK_SELECT).eq("project_id", id).is("deleted_at", null).limit(1000),
    s.supabase.from("milestones").select("id, title, due_date, completed_at").eq("project_id", id).order("position"),
    s.supabase.from("meetings").select("id, title, starts_at").eq("project_id", id).is("deleted_at", null).order("starts_at", { ascending: false }),
    s.supabase.from("notes").select("id, kind, title, body, pinned, created_at").eq("project_id", id).is("deleted_at", null).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  const all = sortTasks((tasks ?? []) as unknown as TaskRow[]);
  const open = all.filter((x) => x.status === "todo");
  const closed = all.filter((x) => x.status !== "todo");
  const progress = projectProgress(all, milestones ?? []);
  const program = programs?.find((p) => p.id === project.program_id);
  const now = new Date().toISOString();

  return (
    <div>
      {program && (
        <Link href={`/programs/${program.id}`} className="mb-2 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary">
          <Layers size={14} /> {program.name}
        </Link>
      )}
      <ProjectTitle id={project.id} name={project.name} status={project.status as "active"} />

      <Card className="mt-5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {progress.basis === "tasks"
              ? t("project.progressTasks", { done: progress.done, total: progress.total })
              : progress.basis === "milestones"
                ? t("project.progressMilestones", { done: progress.done, total: progress.total })
                : t("project.noSteps")}
            <HelpTip text={t("project.progressHelp")} />
          </span>
          {progress.pct !== null && <span className="text-xl font-semibold">{progress.pct}%</span>}
        </div>
        <ProgressBar value={progress.pct} tone={project.status === "completed" ? "success" : "primary"} label={project.name} />
        <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-ink-muted">
          {project.target_date && <span>{t("project.targetDate")}: {fmtShortDay(project.target_date, s.numerals)}</span>}
          <span>{t("project.lastActivity")}: {fmtShortDay(todayIn(s.tz, new Date(project.last_activity_at)), s.numerals)}</span>
        </p>
      </Card>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              key: "tasks",
              label: t("project.tasks"),
              count: open.length,
              content: (
                <Card className="px-2 py-2">
                  {open.map((task) => <TaskItem key={task.id} task={task} showProject={false} showStar />)}
                  {all.length === 0 && <p className="px-2 py-2 text-sm text-ink-muted">{t("project.firstTask")}</p>}
                  <ProjectTaskAdd projectId={project.id} placeholder={t("task.titlePlaceholder")} />
                  {closed.length > 0 && (
                    <Collapsible label={`${t("task.filterDone")} (${closed.length})`}>
                      {closed.map((task) => <TaskItem key={task.id} task={task} showProject={false} />)}
                    </Collapsible>
                  )}
                </Card>
              ),
            },
            {
              key: "milestones",
              label: t("project.milestones"),
              count: milestones?.filter((m) => !m.completed_at).length,
              content: (
                <Card className="px-2 py-2">
                  <Milestones projectId={project.id} items={milestones ?? []} />
                </Card>
              ),
            },
            {
              key: "overview",
              label: t("project.overview"),
              content: (
                <Card className="p-4">
                  <ProjectDetails
                    project={{ ...project, links: (project.links as { title: string; url: string }[]) ?? [] }}
                    contexts={contexts.map((c) => ({ id: c.id, name: c.name }))}
                    programs={(programs ?? []).map((p) => ({ id: p.id, name: p.name }))}
                    goals={(goals ?? []).map((g) => ({ id: g.id, name: g.title }))}
                  />
                </Card>
              ),
            },
            {
              key: "meetings",
              label: t("project.meetings"),
              count: meetings?.length,
              content: (
                <Card className="px-2 py-2">
                  {meetings?.length ? (
                    meetings.map((m) => (
                      <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/60">
                        <CalendarClock size={17} className={m.starts_at >= now ? "text-primary" : "text-ink-muted"} />
                        <span className="flex-1">{m.title}</span>
                        <span className="text-xs text-ink-muted">{fmtDateTime(m.starts_at, s.tz, s.numerals)}</span>
                      </Link>
                    ))
                  ) : (
                    <EmptyState title={t("project.noMeetings")} className="py-5" />
                  )}
                  <div className="px-2 pb-1">
                    <CaptureButton preset={{ type: "meeting", project_id: project.id }} label={t("meeting.new")} />
                  </div>
                </Card>
              ),
            },
            {
              key: "notes",
              label: t("project.notes"),
              count: notes?.length,
              content: (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <CaptureButton preset={{ type: "note", project_id: project.id }} label={t("note.add")} />
                    <CaptureButton preset={{ type: "idea", project_id: project.id }} label={t("note.idea")} />
                  </div>
                  {notes?.length ? <NoteList notes={notes as never} showProject={false} /> : <Card><EmptyState title={t("project.noNotes")} className="py-5" /></Card>}
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="mt-8 flex justify-end border-t border-line pt-4">
        <DeleteProject id={project.id} />
      </div>
    </div>
  );
}
