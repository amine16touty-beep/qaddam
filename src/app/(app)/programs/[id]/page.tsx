import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getContexts, getSession } from "@/lib/session";
import { loadProjects } from "@/lib/queries/projects";
import { Card, EmptyState, ProgressBar } from "@/components/ui";
import { ProjectCard } from "@/components/projects/project-card";
import { ProgramHeader } from "@/components/projects/project-client";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const s = await getSession();
  const t = await getTranslations();
  const { data: program } = await s.supabase.from("programs").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!program) notFound();
  const [projects, contexts] = await Promise.all([loadProjects(s, { programId: id, ignoreContext: true }), getContexts()]);
  const done = projects.reduce((a, p) => a + p.progress.done, 0);
  const total = projects.reduce((a, p) => a + p.progress.total, 0);
  const pct = total ? Math.round((done / total) * 100) : null;

  return (
    <div>
      <ProgramHeader program={{ ...program, status: program.status as "active" }} />
      {total > 0 && (
        <Card className="mb-6 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>{t("project.progressTasks", { done, total })}</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <ProgressBar value={pct} label={program.name} />
        </Card>
      )}
      <h2 className="mb-3 text-sm font-semibold text-ink-muted">{t("project.programProjects")} ({projects.length})</h2>
      {projects.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => <ProjectCard key={p.id} p={p} color={contexts.find((c) => c.id === p.context_id)?.color} numerals={s.numerals} />)}
        </div>
      ) : (
        <Card><EmptyState title={t("project.programEmpty")} /></Card>
      )}
    </div>
  );
}
