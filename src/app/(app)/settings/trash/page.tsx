import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, Trash2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { TrashRow } from "@/components/settings/trash-row";
import { fmtShortDay } from "@/lib/format";

export const metadata = { title: "سلة المحذوفات" };

const TABLES = [
  { table: "tasks", label: "capture.task", col: "title" },
  { table: "projects", label: "capture.project", col: "name" },
  { table: "meetings", label: "capture.meeting", col: "title" },
  { table: "habits", label: "capture.habit", col: "name" },
  { table: "notes", label: "capture.note", col: "body" },
  { table: "programs", label: "project.program", col: "name" },
  { table: "goals", label: "goal.title", col: "title" },
] as const;

export default async function TrashPage() {
  const s = await getSession();
  const t = await getTranslations();
  const results = await Promise.all(
    TABLES.map(async (x) => {
      const { data } = await s.supabase.from(x.table).select(`id, ${x.col}, deleted_at`).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(100);
      return ((data ?? []) as unknown as Record<string, string>[]).map((r) => ({ table: x.table, label: t(x.label), id: r.id, title: String(r[x.col] ?? "").slice(0, 120), deleted_at: r.deleted_at }));
    }),
  );
  const items = results.flat().sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
  return (
    <div>
      <Link href="/settings" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-primary"><ChevronRight size={15} /> {t("settings.title")}</Link>
      <PageHeader title={t("settings.trash")} subtitle={t("settings.trashHelp")} />
      <Card className="px-2 py-2">
        {items.length ? items.map((i) => <TrashRow key={i.table + i.id} item={{ ...i, when: fmtShortDay(i.deleted_at.slice(0, 10), s.numerals) }} />) : <EmptyState icon={<Trash2 size={28} />} title={t("settings.trashEmpty")} />}
      </Card>
    </div>
  );
}
