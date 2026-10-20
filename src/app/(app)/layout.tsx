import { AppShell } from "@/components/shell/app-shell";
import { getActiveProjects, getContexts, getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [s, contexts, projects] = await Promise.all([getSession(), getContexts(), getActiveProjects()]);
  return (
    <AppShell
      data={{
        today: s.today,
        tz: s.tz,
        weekStart: s.weekStart,
        numerals: s.numerals,
        contexts: contexts.map((c) => ({ id: c.id, name: c.name, color: c.color })),
        projects: projects.map((p) => ({ id: p.id, name: p.name, context_id: p.context_id })),
        contextFilter: contexts.some((c) => c.id === s.contextFilter) ? s.contextFilter : null,
      }}
    >
      {children}
    </AppShell>
  );
}
