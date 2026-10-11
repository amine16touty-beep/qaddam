import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FolderKanban, Layers } from "lucide-react";
import { getContexts, getSession } from "@/lib/session";
import { loadProjects } from "@/lib/queries/projects";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ProjectCard } from "@/components/projects/project-card";
import { NewProgramButton } from "@/components/projects/project-client";
import { cn } from "@/lib/utils";
import { AddTaskButton } from "../today/today-client";

export const metadata = { title: "مشاريعي" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const s = await getSession();
  const t = await getTranslations();
  const { view } = await searchParams;
  const [projects, contexts, { data: programs }] = await Promise.all([
    loadProjects(s),
    getContexts(),
    s.supabase.from("programs").select("id, name, status, description").is("deleted_at", null).order("created_at"),
  ]);
  const color = (id: string | null) => contexts.find((c) => c.id === id)?.color;
  const hasPrograms = (programs?.length ?? 0) > 0;
  const byProgram = view === "programs" && hasPrograms;

  const groups = [
    { key: "active", label: t("project.groupActive"), items: projects.filter((p) => p.status === "active") },
    { key: "other", label: t("project.groupOther"), items: projects.filter((p) => p.status === "planned" || p.status === "paused") },
    { key: "closed", label: t("project.groupClosed"), items: projects.filter((p) => p.status === "completed" || p.status === "cancelled") },
  ];

  return (
    <div>
      <PageHeader
        title={t("project.projects")}
        actions={
          <>
            <NewProgramButton label={t("project.newProgram")} />
            <AddTaskButton label={t("project.addProject")} type="project" />
          </>
        }
      />

      {hasPrograms && (
        <div className="mb-5 inline-flex rounded-xl bg-muted p-1">
          <Link href="/projects" className={cn("rounded-lg px-3 py-1.5 text-sm", !byProgram ? "bg-surface font-medium shadow-sm" : "text-ink-muted")}>
            {t("project.list")}
          </Link>
          <Link href="/projects?view=programs" className={cn("rounded-lg px-3 py-1.5 text-sm", byProgram ? "bg-surface font-medium shadow-sm" : "text-ink-muted")}>
            {t("project.byProgram")}
          </Link>
        </div>
      )}

      {projects.length === 0 && !hasPrograms ? (
        <Card>
          <EmptyState icon={<FolderKanban size={36} />} title={t("project.empty")} action={<AddTaskButton label={t("project.new")} type="project" />} />
        </Card>
      ) : byProgram ? (
        <div className="space-y-8">
          {[...(programs ?? []), { id: null, name: t("project.noProgram"), status: null, description: null }].map((prog) => {
            const items = projects.filter((p) => p.program_id === prog.id);
            if (!prog.id && !items.length) return null;
            const done = items.reduce((a, p) => a + p.progress.done, 0);
            const total = items.reduce((a, p) => a + p.progress.total, 0);
            return (
              <section key={prog.id ?? "none"}>
                <div className="mb-3 flex items-center gap-2">
                  <Layers size={18} className="text-primary" />
                  {prog.id ? (
                    <Link href={`/programs/${prog.id}`} className="text-lg font-semibold hover:text-primary">{prog.name}</Link>
                  ) : (
                    <h2 className="text-lg font-semibold text-ink-muted">{prog.name}</h2>
                  )}
                  {prog.id && total > 0 && <span className="text-sm text-ink-muted">· {Math.round((done / total) * 100)}%</span>}
                </div>
                {items.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {items.map((p) => <ProjectCard key={p.id} p={p} color={color(p.context_id)} numerals={s.numerals} />)}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">{t("project.programEmpty")}</p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) =>
            g.items.length ? (
              <section key={g.key} aria-labelledby={`g-${g.key}`}>
                <h2 id={`g-${g.key}`} className="mb-3 text-sm font-semibold text-ink-muted">
                  {g.label} ({g.items.length})
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {g.items.map((p) => <ProjectCard key={p.id} p={p} color={color(p.context_id)} numerals={s.numerals} />)}
                </div>
              </section>
            ) : null,
          )}
          {projects.length === 0 && <Card><EmptyState title={t("project.emptyFilter")} /></Card>}
        </div>
      )}
    </div>
  );
}
