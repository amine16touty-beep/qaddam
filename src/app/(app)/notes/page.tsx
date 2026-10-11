import { getTranslations } from "next-intl/server";
import { NotebookPen } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { NoteList } from "@/components/notes/note-list";
import { AddTaskButton } from "../today/today-client";

export const metadata = { title: "الملاحظات والأفكار" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const s = await getSession();
  const t = await getTranslations();
  const { open } = await searchParams;
  let q = s.supabase.from("notes").select("id, kind, title, body, pinned, created_at, project:projects(id, name)").is("deleted_at", null).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  if (s.contextFilter) q = q.eq("context_id", s.contextFilter);
  const { data } = await q;
  return (
    <div>
      <PageHeader title={t("note.inbox")} actions={<><AddTaskButton label={t("note.idea")} type="idea" /><AddTaskButton label={t("note.note")} type="note" /></>} />
      {data?.length ? (
        <NoteList notes={data as never} openId={open} />
      ) : (
        <Card><EmptyState icon={<NotebookPen size={32} />} title={t("note.empty")} /></Card>
      )}
    </div>
  );
}
