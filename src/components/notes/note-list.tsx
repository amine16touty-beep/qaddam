"use client";
import { useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FolderKanban, Lightbulb, NotebookPen, Pin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteNote, restoreNote, updateNote } from "@/app/actions/notes";
import { useShell } from "@/components/shell/shell-context";
import { fmtShortDay } from "@/lib/format";

export type NoteRow = {
  id: string;
  kind: "note" | "idea";
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  project?: { id: string; name: string } | null;
};

export function NoteList({ notes, openId, showProject = true }: { notes: NoteRow[]; openId?: string; showProject?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} highlight={n.id === openId} showProject={showProject} />
      ))}
    </div>
  );
}

function NoteCard({ note, highlight, showProject }: { note: NoteRow; highlight: boolean; showProject: boolean }) {
  const t = useTranslations();
  const { data } = useShell();
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: "center" });
  }, [highlight]);

  const Icon = note.kind === "idea" ? Lightbulb : NotebookPen;
  const save = (body: string) =>
    body !== note.body &&
    start(async () => {
      const r = await updateNote(note.id, { body });
      if (!r.ok) toast.error(r.error);
     
    });

  return (
    <div ref={ref} className={cn("group rounded-[var(--radius-card)] border bg-surface p-4", highlight ? "border-primary" : "border-line", pending && "opacity-70")}>
      <div className="mb-2 flex items-center gap-2 text-xs text-ink-muted">
        <Icon size={14} className={note.kind === "idea" ? "text-warning" : ""} />
        <span>{t(note.kind === "idea" ? "note.idea" : "note.note")}</span>
        <span>· {fmtShortDay(note.created_at.slice(0, 10), data.numerals)}</span>
        {showProject && note.project && (
          <Link href={`/projects/${note.project.id}`} className="inline-flex items-center gap-1 hover:text-primary">
            · <FolderKanban size={12} /> {note.project.name}
          </Link>
        )}
        <span className="ms-auto flex gap-1">
          <button
            aria-label={t("note.pin")}
            aria-pressed={note.pinned}
            onClick={() => start(async () => { await updateNote(note.id, { pinned: !note.pinned }); })}
            className={cn("rounded p-1 hover:bg-muted", note.pinned ? "text-primary" : "opacity-60")}
          >
            <Pin size={14} />
          </button>
          <button
            aria-label={t("app.delete")}
            onClick={() =>
              start(async () => {
                const r = await deleteNote(note.id);
                if (!r.ok) return void toast.error(r.error);
                toast(t("app.deleted"), { action: { label: t("app.undo"), onClick: () => restoreNote(note.id) } });
              })
            }
            className="rounded p-1 opacity-60 hover:bg-muted hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </span>
      </div>
      {note.title && <p className="mb-1 font-medium">{note.title}</p>}
      <textarea
        defaultValue={note.body}
        onBlur={(e) => save(e.target.value)}
        aria-label={t("note.body")}
        rows={Math.min(8, Math.max(2, note.body.split("\n").length))}
        className="w-full resize-y bg-transparent text-[15px] leading-7 focus:outline-none"
      />
    </div>
  );
}
