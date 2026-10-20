"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ArrowLeftRight, CalendarPlus, CheckCircle2, CircleDashed, ExternalLink, ListChecks, MapPin, Trash2, UserRound, Video } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { AutosaveTextarea } from "@/components/ui/autosave-textarea";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { googleEventUrl } from "@/lib/domain/calendar";
import {
  convertAllDecisions,
  convertDecision,
  createDecision,
  deleteDecision,
  deleteMeeting,
  restoreMeeting,
  updateDecision,
  updateMeeting,
} from "@/app/actions/meetings";
import { useShell } from "@/components/shell/shell-context";

type Meeting = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  url: string | null;
  project_id: string | null;
  participants: string[];
  agenda: string;
  notes: string;
};

export type DecisionRow = {
  id: string;
  text: string;
  action: string | null;
  owner_text: string | null;
  due_date: string | null;
  task: { id: string; status: string; title: string } | null;
};

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      ok?.();
    });
  return { run, pending };
}

export function MeetingHeader({ meeting }: { meeting: Meeting }) {
  const t = useTranslations();
  const router = useRouter();
  const { data } = useShell();
  const { run } = useRun();
  const { confirm, dialog } = useConfirm();
  const day = formatInTimeZone(new Date(meeting.starts_at), data.tz, "yyyy-MM-dd");
  const time = formatInTimeZone(new Date(meeting.starts_at), data.tz, "HH:mm");
  const dur = meeting.ends_at ? Math.round((new Date(meeting.ends_at).getTime() - new Date(meeting.starts_at).getTime()) / 60000) : "";
  const [d, setD] = useState(day);
  const [tm, setTm] = useState(time);

  const saveWhen = (nd: string, nt: string, minutes: number | "") => {
    if (!nd || !nt) return;
    const start = fromZonedTime(`${nd}T${nt}:00`, data.tz);
    run(() => updateMeeting(meeting.id, { starts_at: start.toISOString(), ends_at: minutes ? new Date(start.getTime() + Number(minutes) * 60000).toISOString() : null }));
  };

  return (
    <div className="space-y-3">
      <input
        defaultValue={meeting.title}
        aria-label={t("meeting.title")}
        maxLength={200}
        onBlur={(e) => e.target.value.trim() && e.target.value !== meeting.title && run(() => updateMeeting(meeting.id, { title: e.target.value }))}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="-mx-1 w-full rounded-lg bg-transparent px-1 text-2xl font-semibold hover:bg-muted/60 focus:bg-muted focus:outline-none sm:text-[28px]"
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Input type="date" value={d} aria-label={t("meeting.date")} onChange={(e) => { setD(e.target.value); saveWhen(e.target.value, tm, dur); }} className="h-9 w-auto" />
        <Input type="time" value={tm} aria-label={t("meeting.time")} onChange={(e) => setTm(e.target.value)} onBlur={() => tm !== time && saveWhen(d, tm, dur)} className="h-9 w-auto" />
        <Input
          type="number"
          min={0}
          step={15}
          defaultValue={dur}
          placeholder={t("meeting.duration")}
          aria-label={t("meeting.duration")}
          onBlur={(e) => saveWhen(d, tm, e.target.value ? Number(e.target.value) : "")}
          className="h-9 w-28"
        />
        <Select
          aria-label={t("meeting.project")}
          defaultValue={meeting.project_id ?? ""}
          onChange={(e) => run(() => updateMeeting(meeting.id, { project_id: e.target.value || null }))}
          className="h-9 w-auto max-w-56"
        >
          <option value="">{t("meeting.project")}: {t("app.none")}</option>
          {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <MapPin size={15} className="text-ink-muted" />
          <input defaultValue={meeting.location ?? ""} placeholder={t("meeting.location")} aria-label={t("meeting.location")} onBlur={(e) => e.target.value !== (meeting.location ?? "") && run(() => updateMeeting(meeting.id, { location: e.target.value }))} className="h-9 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <Video size={15} className="text-ink-muted" />
          <input defaultValue={meeting.url ?? ""} placeholder={t("meeting.url")} aria-label={t("meeting.url")} dir="ltr" onBlur={(e) => e.target.value !== (meeting.url ?? "") && run(() => updateMeeting(meeting.id, { url: e.target.value }))} className="h-9 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          {meeting.url && <a href={meeting.url} target="_blank" rel="noopener noreferrer" aria-label={t("meeting.join")} className="text-primary"><ExternalLink size={15} /></a>}
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <UserRound size={15} className="text-ink-muted" />
          <input
            defaultValue={meeting.participants.join("، ")}
            placeholder={t("meeting.participantsPlaceholder")}
            aria-label={t("meeting.participants")}
            onBlur={(e) => {
              const list = e.target.value.split(/[,،]/).map((x) => x.trim()).filter(Boolean);
              if (list.join("|") !== meeting.participants.join("|")) run(() => updateMeeting(meeting.id, { participants: list }));
            }}
            className="h-9 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </label>
      </div>
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          title={t("gcal.addEventHint")}
          onClick={() => window.open(googleEventUrl(meeting, window.location.origin), "_blank", "noopener,noreferrer")}
        >
          <CalendarPlus size={15} /> {t("gcal.addEvent")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!(await confirm(t("meeting.deleteConfirm")))) return;
            const r = await deleteMeeting(meeting.id);
            if (!r.ok) return void toast.error(r.error);
            router.push("/calendar");
            toast(t("app.deleted"), { action: { label: t("app.undo"), onClick: () => restoreMeeting(meeting.id).then(() => router.push(`/meetings/${meeting.id}`)) } });
          }}
        >
          <Trash2 size={15} /> {t("app.delete")}
        </Button>
      </div>
      {dialog}
    </div>
  );
}

export function MeetingTexts({ meeting }: { meeting: Meeting }) {
  const t = useTranslations("meeting");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-3">
        <h2 className="mb-1 px-3 pt-1 text-sm font-semibold">{t("agenda")}</h2>
        <AutosaveTextarea draftKey={`agenda:${meeting.id}`} value={meeting.agenda} onSave={(v) => updateMeeting(meeting.id, { agenda: v })} placeholder={t("agendaPlaceholder")} rows={5} aria-label={t("agenda")} />
      </section>
      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-3">
        <h2 className="mb-1 px-3 pt-1 text-sm font-semibold">{t("notes")}</h2>
        <AutosaveTextarea draftKey={`notes:${meeting.id}`} value={meeting.notes} onSave={(v) => updateMeeting(meeting.id, { notes: v })} placeholder={t("notesPlaceholder")} rows={5} aria-label={t("notes")} />
      </section>
    </div>
  );
}

export function Decisions({ meetingId, items }: { meetingId: string; items: DecisionRow[] }) {
  const t = useTranslations();
  const { run, pending } = useRun();
  const unconverted = items.filter((d) => !d.task).length;

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold"><ListChecks size={18} className="text-primary" /> {t("meeting.decisions")}</h2>
        {unconverted > 0 && items.length > 1 && (
          <Button
            variant="soft"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () => convertAllDecisions(meetingId),
                () => toast.success(t("meeting.convertedAll", { count: unconverted })),
              )
            }
          >
            <ArrowLeftRight size={15} /> {t("meeting.convertAll")}
          </Button>
        )}
      </div>
      <ol className="divide-y divide-line">
        {items.map((d, i) => (
          <DecisionItem key={d.id} d={d} n={i + 1} />
        ))}
      </ol>
      {items.length === 0 && <p className="px-4 pb-2 text-sm text-ink-muted">{t("meeting.noDecisions")}</p>}
      <form
        className="flex items-center gap-2 border-t border-line px-4 py-2"
        action={(f) => {
          const text = String(f.get("text") ?? "").trim();
          if (!text) return;
          run(() => createDecision(meetingId, { text }), () => {
            const el = document.getElementById("new-decision") as HTMLInputElement | null;
            if (el) { el.value = ""; el.focus(); }
          });
        }}
      >
        <input id="new-decision" name="text" placeholder={t("meeting.decisionPlaceholder")} aria-label={t("meeting.decisionPlaceholder")} maxLength={1000} autoComplete="off" className="h-10 flex-1 bg-transparent text-[15px] focus:outline-none" />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>{t("app.add")}</Button>
      </form>
    </section>
  );
}

function DecisionItem({ d, n }: { d: DecisionRow; n: number }) {
  const t = useTranslations();
  const { run, pending } = useRun();
  const up = (patch: Parameters<typeof updateDecision>[1]) => run(() => updateDecision(d.id, patch));
  const done = d.task?.status === "done";

  return (
    <li id={`d-${d.id}`} className="group px-4 py-3 target:bg-primary-soft/40">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-ink-muted">{n}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            defaultValue={d.text}
            aria-label={t("meeting.decisions")}
            onBlur={(e) => e.target.value.trim() && e.target.value !== d.text && up({ text: e.target.value })}
            className="w-full bg-transparent text-[15px] font-medium focus:outline-none"
          />
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
            <input defaultValue={d.action ?? ""} placeholder={t("meeting.actionPlaceholder")} aria-label={t("meeting.action")} onBlur={(e) => e.target.value !== (d.action ?? "") && up({ action: e.target.value })} disabled={!!d.task} className="h-9 rounded-lg border border-line bg-bg px-2 text-sm disabled:opacity-70" />
            <input defaultValue={d.owner_text ?? ""} placeholder={`${t("meeting.owner")}: ${t("meeting.ownerPlaceholder")}`} aria-label={t("meeting.owner")} onBlur={(e) => e.target.value !== (d.owner_text ?? "") && up({ owner_text: e.target.value })} disabled={!!d.task} className="h-9 rounded-lg border border-line bg-bg px-2 text-sm disabled:opacity-70" />
            <input type="date" defaultValue={d.due_date ?? ""} aria-label={t("meeting.due")} onChange={(e) => up({ due_date: e.target.value || null })} disabled={!!d.task} className="h-9 rounded-lg border border-line bg-bg px-2 text-sm disabled:opacity-70" />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {d.task ? (
            <Link
              href={`/tasks?open=${d.task.id}`}
              className={cn("inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium", done ? "bg-success-soft text-success" : "bg-primary-soft text-primary")}
              title={d.task.title}
            >
              {done ? <CheckCircle2 size={14} /> : <CircleDashed size={14} />}
              {t("meeting.converted")} · {done ? t("meeting.done") : t("meeting.pending")}
            </Link>
          ) : (
            <Button size="sm" disabled={pending} onClick={() => run(() => convertDecision(d.id), () => toast.success(t("meeting.convertedToast")))}>
              {t("meeting.toTask")}
            </Button>
          )}
          <button aria-label={t("meeting.deleteDecision")} onClick={() => run(() => deleteDecision(d.id))} className="rounded p-1 text-ink-muted opacity-60 hover:text-danger desk:opacity-0 desk:group-hover:opacity-100">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </li>
  );
}
