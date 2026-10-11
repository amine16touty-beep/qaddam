import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight, FolderKanban } from "lucide-react";
import { getSession } from "@/lib/session";
import { fmtDateTime } from "@/lib/format";
import { Decisions, MeetingHeader, MeetingTexts, type DecisionRow } from "@/components/meetings/meeting-client";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const s = await getSession();
  const t = await getTranslations();
  const { data: meeting } = await s.supabase.from("meetings").select("*, project:projects(id, name)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!meeting) notFound();
  const [{ data: decisions }, { data: tasks }] = await Promise.all([
    s.supabase.from("decisions").select("id, text, action, owner_text, due_date").eq("meeting_id", id).order("position").order("created_at"),
    s.supabase.from("tasks").select("id, status, title, decision_id").eq("meeting_id", id).is("deleted_at", null).not("decision_id", "is", null),
  ]);
  const items: DecisionRow[] = (decisions ?? []).map((d) => ({ ...d, task: tasks?.find((x) => x.decision_id === d.id) ?? null }));
  const project = meeting.project as { id: string; name: string } | null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
        <Link href="/calendar" className="inline-flex items-center gap-1 hover:text-primary"><ChevronRight size={15} /> {t("calendar.title")}</Link>
        <span>· {fmtDateTime(meeting.starts_at, s.tz, s.numerals)}</span>
        {project && <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 hover:text-primary"><FolderKanban size={14} /> {project.name}</Link>}
      </div>
      <MeetingHeader meeting={meeting} />
      <MeetingTexts meeting={meeting} />
      <Decisions meetingId={meeting.id} items={items} />
    </div>
  );
}
