"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown, ExternalLink, Flag, Layers, Link2, Plus, Trash2, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { InlineAdd } from "@/components/ui/inline-add";
import { CheckCircle, useDueLabel } from "@/components/tasks/task-item";
import { cn } from "@/lib/utils";
import {
  createMilestone,
  createProgram,
  deleteMilestone,
  deleteProject,
  deleteProgram,
  restoreProject,
  toggleMilestone,
  updateMilestone,
  updateProgram,
  updateProject,
} from "@/app/actions/projects";
import { createTask } from "@/app/actions/tasks";
import { useConfirm } from "@/components/ui/confirm";

type Opt = { id: string; name: string };
const STATUSES = ["planned", "active", "paused", "completed", "cancelled"] as const;

export function NewProgramButton({ label }: { label: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Layers size={16} /> {label}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("project.newProgram")}>
        <p className="mb-4 text-sm text-ink-muted">{t("project.programHint")}</p>
        <form
          className="space-y-4"
          action={(f) =>
            start(async () => {
              const r = await createProgram({ name: String(f.get("name")), description: String(f.get("description") ?? "") });
              if (!r.ok) return setError(r.error);
              setOpen(false);
              router.push(`/programs/${r.data!.id}`);
            })
          }
        >
          <Field label={t("project.programName")} htmlFor="pg-name">
            <Input id="pg-name" name="name" required maxLength={200} autoFocus />
          </Field>
          <Field label={t("project.description")} htmlFor="pg-desc">
            <Textarea id="pg-desc" name="description" rows={2} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>{t("app.add")}</Button>
        </form>
      </Sheet>
    </>
  );
}

function useSaver() {
  const t = useTranslations("app");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, start] = useTransition();
  const save = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setState("saving");
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setState("error");
        toast.error(r.error);
      } else {
        setState("saved");
      }
    });
  };
  const indicator = (
    <span className="text-xs text-ink-muted" aria-live="polite">
      {state === "saving" ? t("saving") : state === "saved" ? `${t("saved")} ✓` : state === "error" ? t("saveFailed") : ""}
    </span>
  );
  return { save, indicator };
}

export function ProjectTitle({ id, name, status }: { id: string; name: string; status: (typeof STATUSES)[number] }) {
  const t = useTranslations("project");
  const { save, indicator } = useSaver();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        defaultValue={name}
        aria-label={t("name")}
        maxLength={200}
        onBlur={(e) => e.target.value.trim() && e.target.value !== name && save(() => updateProject(id, { name: e.target.value }))}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="min-w-0 flex-1 rounded-lg bg-transparent px-1 -mx-1 text-2xl font-semibold leading-tight hover:bg-muted/60 focus:bg-muted focus:outline-none sm:text-[28px]"
      />
      <Select
        aria-label={t("status")}
        defaultValue={status}
        onChange={(e) => save(() => updateProject(id, { status: e.target.value as "active" }))}
        className="h-9 w-auto pe-8 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{t(s)}</option>
        ))}
      </Select>
      {indicator}
    </div>
  );
}

export function ProjectDetails({
  project,
  contexts,
  programs,
  goals,
}: {
  project: {
    id: string;
    description: string | null;
    objective: string | null;
    context_id: string | null;
    program_id: string | null;
    goal_id: string | null;
    start_date: string | null;
    target_date: string | null;
    links: { title: string; url: string }[];
  };
  contexts: Opt[];
  programs: Opt[];
  goals: Opt[];
}) {
  const t = useTranslations();
  const { save, indicator } = useSaver();
  const [more, setMore] = useState(!!(project.objective || project.program_id || project.goal_id || project.start_date));
  const up = (patch: Parameters<typeof updateProject>[1]) => save(() => updateProject(project.id, patch));
  const [links, setLinks] = useState(project.links);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{indicator}</div>
      <Field label={t("project.description")} htmlFor="pd-desc">
        <Textarea id="pd-desc" rows={2} defaultValue={project.description ?? ""} maxLength={2000} onBlur={(e) => e.target.value !== (project.description ?? "") && up({ description: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("task.context")} htmlFor="pd-ctx">
          <Select id="pd-ctx" defaultValue={project.context_id ?? ""} onChange={(e) => up({ context_id: e.target.value || null })}>
            <option value="">{t("app.none")}</option>
            {contexts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t("project.targetDate")} htmlFor="pd-target">
          <Input id="pd-target" type="date" defaultValue={project.target_date ?? ""} onChange={(e) => up({ target_date: e.target.value || null })} />
        </Field>
      </div>
      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex items-center gap-1 text-sm text-ink-muted hover:text-primary">
        <ChevronDown size={16} className={cn("transition-transform", more && "rotate-180")} /> {t("project.moreDetails")}
      </button>
      {more && (
        <div className="animate-in grid gap-3 sm:grid-cols-2">
          <Field label={t("project.objective")} htmlFor="pd-obj" className="sm:col-span-2">
            <Input id="pd-obj" defaultValue={project.objective ?? ""} maxLength={1000} onBlur={(e) => e.target.value !== (project.objective ?? "") && up({ objective: e.target.value })} />
          </Field>
          <Field label={t("project.startDate")} htmlFor="pd-start">
            <Input id="pd-start" type="date" defaultValue={project.start_date ?? ""} onChange={(e) => up({ start_date: e.target.value || null })} />
          </Field>
          <Field label={t("project.program")} htmlFor="pd-prog">
            <Select id="pd-prog" defaultValue={project.program_id ?? ""} onChange={(e) => up({ program_id: e.target.value || null })}>
              <option value="">{t("project.noProgram")}</option>
              {programs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          {goals.length > 0 && (
            <Field label={t("project.goal")} htmlFor="pd-goal">
              <Select id="pd-goal" defaultValue={project.goal_id ?? ""} onChange={(e) => up({ goal_id: e.target.value || null })}>
                <option value="">{t("app.none")}</option>
                {goals.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">{t("project.links")}</p>
        <ul className="space-y-1">
          {links.map((l, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
              <Link2 size={15} className="shrink-0 text-ink-muted" />
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm text-primary hover:underline">
                {l.title || l.url}
              </a>
              <ExternalLink size={13} className="text-ink-muted" />
              <button
                aria-label={t("app.delete")}
                onClick={() => {
                  const next = links.filter((_, j) => j !== i);
                  setLinks(next);
                  up({ links: next });
                }}
                className="rounded p-1 text-ink-muted hover:text-danger"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex flex-wrap gap-2"
          action={(f) => {
            const url = String(f.get("url") ?? "").trim();
            if (!url) return;
            const next = [...links, { title: String(f.get("title") ?? "").trim(), url: /^https?:\/\//.test(url) ? url : `https://${url}` }];
            setLinks(next);
            up({ links: next });
          }}
        >
          <Input name="title" placeholder={t("project.linkTitle")} className="h-9 flex-1 basis-32 text-sm" maxLength={120} />
          <Input name="url" placeholder="https://" dir="ltr" className="h-9 flex-[2] basis-48 text-sm" required />
          <Button type="submit" variant="secondary" size="sm" className="h-9"><Plus size={15} /> {t("project.addLink")}</Button>
        </form>
      </div>
    </div>
  );
}

export function ProjectTaskAdd({ projectId, placeholder }: { projectId: string; placeholder: string }) {
  return (
    <InlineAdd
      placeholder={placeholder}
      withDate
      onAdd={async (title, date) => {
        const r = await createTask({ title, project_id: projectId, due_date: date });
        return r;
      }}
    />
  );
}

export type MilestoneRow = { id: string; title: string; due_date: string | null; completed_at: string | null };

export function Milestones({ projectId, items }: { projectId: string; items: MilestoneRow[] }) {
  const t = useTranslations();
  const dueLabel = useDueLabel();
  const [, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
    });

  return (
    <div>
      <ol className="relative">
        {items.map((m) => {
          const d = !m.completed_at ? dueLabel(m.due_date) : null;
          return (
            <li key={m.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60">
              <CheckCircle checked={!!m.completed_at} onClick={() => run(() => toggleMilestone(m.id, !m.completed_at))} label={t("project.milestoneDone")} />
              <Flag size={15} className={cn("shrink-0", m.completed_at ? "text-success" : "text-ink-muted")} />
              <input
                defaultValue={m.title}
                aria-label={t("project.milestonePlaceholder")}
                onBlur={(e) => e.target.value.trim() && e.target.value !== m.title && run(() => updateMilestone(m.id, { title: e.target.value }))}
                className={cn("min-w-0 flex-1 bg-transparent text-[15px] focus:outline-none", m.completed_at && "text-ink-muted line-through")}
              />
              {d && <span className={cn("text-xs", d.tone === "danger" ? "text-danger" : "text-ink-muted")}>{d.text}</span>}
              <input
                type="date"
                defaultValue={m.due_date ?? ""}
                aria-label={t("task.due")}
                onChange={(e) => run(() => updateMilestone(m.id, { due_date: e.target.value || null }))}
                className="h-8 w-[8.5rem] rounded-lg border border-transparent bg-transparent px-1 text-xs text-ink-muted hover:border-line"
              />
              <button aria-label={t("app.delete")} onClick={() => run(() => deleteMilestone(m.id))} className="rounded p-1 text-ink-muted opacity-60 hover:text-danger lg:opacity-0 lg:group-hover:opacity-100">
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ol>
      <InlineAdd
        placeholder={t("project.milestonePlaceholder")}
        withDate
        onAdd={async (title, date) => {
          const r = await createMilestone(projectId, title, date);
          return r;
        }}
      />
    </div>
  );
}

export function DeleteProject({ id }: { id: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={async () => {
          if (!(await confirm(t("project.deleteConfirm")))) return;
          start(async () => {
            const r = await deleteProject(id);
            if (!r.ok) return void toast.error(r.error);
            router.push("/projects");
            toast(t("app.deleted"), { action: { label: t("app.undo"), onClick: () => restoreProject(id).then(() => router.push(`/projects/${id}`)) } });
          });
        }}
      >
        <Trash2 size={15} /> {t("app.delete")}
      </Button>
      {dialog}
    </>
  );
}

export function ProgramHeader({ program }: { program: { id: string; name: string; description: string | null; status: (typeof STATUSES)[number] } }) {
  const t = useTranslations();
  const router = useRouter();
  const { save, indicator } = useSaver();
  const { confirm, dialog } = useConfirm();
  return (
    <div className="mb-6 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Layers size={22} className="text-primary" />
        <input
          defaultValue={program.name}
          aria-label={t("project.programName")}
          onBlur={(e) => e.target.value.trim() && e.target.value !== program.name && save(() => updateProgram(program.id, { name: e.target.value }))}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 text-2xl font-semibold hover:bg-muted/60 focus:bg-muted focus:outline-none"
        />
        <Select defaultValue={program.status} aria-label={t("project.status")} onChange={(e) => save(() => updateProgram(program.id, { status: e.target.value as "active" }))} className="h-9 w-auto text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{t(`project.${s}`)}</option>)}
        </Select>
        {indicator}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("app.delete")}
          onClick={async () => {
            if (!(await confirm(t("project.deleteConfirm")))) return;
            const r = await deleteProgram(program.id);
            if (r.ok) router.push("/projects");
          }}
        >
          <Trash2 size={16} />
        </Button>
      </div>
      <Textarea
        defaultValue={program.description ?? ""}
        placeholder={t("project.description")}
        rows={2}
        onBlur={(e) => e.target.value !== (program.description ?? "") && save(() => updateProgram(program.id, { description: e.target.value }))}
        className="min-h-0 border-transparent bg-transparent hover:border-line"
      />
      {dialog}
    </div>
  );
}

export function Tabs({ tabs }: { tabs: { key: string; label: string; count?: number; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].key);
  return (
    <div>
      <div role="tablist" className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            id={`tab-${tb.key}`}
            aria-selected={active === tb.key}
            aria-controls={`panel-${tb.key}`}
            onClick={() => setActive(tb.key)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors",
              active === tb.key ? "border-primary font-medium text-primary" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {tb.label}
            {tb.count !== undefined && tb.count > 0 && <span className="ms-1.5 rounded-full bg-muted px-1.5 text-xs text-ink-muted">{tb.count}</span>}
          </button>
        ))}
      </div>
      {tabs.map((tb) => (
        <div key={tb.key} role="tabpanel" id={`panel-${tb.key}`} aria-labelledby={`tab-${tb.key}`} hidden={active !== tb.key}>
          {tb.content}
        </div>
      ))}
    </div>
  );
}
