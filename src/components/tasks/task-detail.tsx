"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, Trash2, Users } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { deleteTask, restoreTask, setTaskStatus, updateTask } from "@/app/actions/tasks";
import { useShell } from "@/components/shell/shell-context";
import type { TaskRow } from "@/lib/queries/tasks";

/** Edits save on change/blur — no "save" button to forget. */
export function TaskDetail({ task, onClose }: { task: TaskRow; onClose: () => void }) {
  const t = useTranslations();
  const { data } = useShell();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState(task.kind);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = (patch: Parameters<typeof updateTask>[1]) => {
    setStatus("saving");
    start(async () => {
      const r = await updateTask(task.id, patch);
      if (!r.ok) {
        setStatus("error");
        toast.error(r.error);
      } else {
        setStatus("saved");
      }
    });
  };

  const remove = () =>
    start(async () => {
      const r = await deleteTask(task.id);
      if (!r.ok) return void toast.error(r.error);
      onClose();
      toast(t("app.deleted"), {
        action: { label: t("app.undo"), onClick: () => restoreTask(task.id) },
      });
    });

  const cancelTask = () =>
    start(async () => {
      const r = await setTaskStatus(task.id, task.status === "cancelled" ? "todo" : "cancelled");
      if (!r.ok) return void toast.error(r.error);
      onClose();
    });

  return (
    <Sheet open onClose={onClose} title={t("task.details")} side>
      <div className="space-y-4">
        <p className="-mt-1 h-4 text-xs text-ink-muted" aria-live="polite">
          {status === "saving" ? t("app.saving") : status === "saved" ? `${t("app.saved")} ✓` : status === "error" ? t("app.saveFailed") : ""}
        </p>
        <Field label={t("task.title")} htmlFor="td-title">
          <Input
            id="td-title"
            defaultValue={task.title}
            maxLength={300}
            required
            onBlur={(e) => e.target.value.trim() && e.target.value !== task.title && save({ title: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("task.due")} htmlFor="td-due">
            <Input id="td-due" type="date" defaultValue={task.due_date ?? ""} onChange={(e) => save({ due_date: e.target.value || null })} />
          </Field>
          <Field label={t("task.dueTime")} htmlFor="td-time">
            <Input id="td-time" type="time" defaultValue={task.due_time?.slice(0, 5) ?? ""} onBlur={(e) => save({ due_time: e.target.value || null })} />
          </Field>
          <Field label={t("task.priority")} htmlFor="td-pr">
            <Select id="td-pr" defaultValue={task.priority} onChange={(e) => save({ priority: e.target.value as "none" })}>
              <option value="none">{t("task.priorityNone")}</option>
              <option value="high">{t("task.priorityHigh")}</option>
              <option value="medium">{t("task.priorityMedium")}</option>
              <option value="low">{t("task.priorityLow")}</option>
            </Select>
          </Field>
          <Field label={t("task.project")} htmlFor="td-project">
            <Select id="td-project" defaultValue={task.project_id ?? ""} onChange={(e) => save({ project_id: e.target.value || null, milestone_id: null })}>
              <option value="">{t("app.none")}</option>
              {task.project && !data.projects.some((p) => p.id === task.project_id) && <option value={task.project.id}>{task.project.name}</option>}
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("task.kind")} htmlFor="td-kind">
            <Select
              id="td-kind"
              value={kind}
              onChange={(e) => {
                const k = e.target.value as "task" | "follow_up";
                setKind(k);
                save({ kind: k, ...(k === "task" ? { owner_text: null } : {}) });
              }}
            >
              <option value="task">{t("task.kindTask")}</option>
              <option value="follow_up">{t("task.kindFollowUp")}</option>
            </Select>
          </Field>
          {kind === "follow_up" && (
            <Field label={t("task.owner")} htmlFor="td-owner">
              <Input id="td-owner" defaultValue={task.owner_text ?? ""} maxLength={80} onBlur={(e) => save({ owner_text: e.target.value || null })} />
            </Field>
          )}
        </div>
        <Field label={t("task.notes")} htmlFor="td-notes">
          <Textarea id="td-notes" defaultValue={task.notes ?? ""} rows={3} maxLength={5000} onBlur={(e) => e.target.value !== (task.notes ?? "") && save({ notes: e.target.value })} />
        </Field>
        {task.meeting && (
          <Link href={`/meetings/${task.meeting.id}`} onClick={onClose} className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary">
            <Users size={16} /> {t("task.fromMeeting", { title: task.meeting.title })}
          </Link>
        )}
        <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
          <Button variant="ghost" size="sm" onClick={cancelTask} disabled={pending}>
            <Ban size={15} /> {task.status === "cancelled" ? t("task.reopen") : t("task.cancelTask")}
          </Button>
          <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
            <Trash2 size={15} /> {t("app.delete")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
