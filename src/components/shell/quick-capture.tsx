"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { CalendarClock, ChevronDown, FolderPlus, Lightbulb, ListTodo, NotebookPen, Repeat, Users } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { addDays, startOfWeek } from "@/lib/domain/dates";
import { weekdayNames } from "@/lib/format";
import { createTask } from "@/app/actions/tasks";
import { createProject } from "@/app/actions/projects";
import { createHabit } from "@/app/actions/habits";
import { createMeeting } from "@/app/actions/meetings";
import { createNote } from "@/app/actions/notes";
import { useShell, type CapturePreset, type CaptureType } from "./shell-context";

const TYPES: { type: CaptureType; icon: typeof ListTodo }[] = [
  { type: "task", icon: ListTodo },
  { type: "habit", icon: Repeat },
  { type: "project", icon: FolderPlus },
  { type: "meeting", icon: Users },
  { type: "note", icon: NotebookPen },
  { type: "idea", icon: Lightbulb },
];

export function QuickCapture({ preset, onClose }: { preset: CapturePreset | null; onClose: () => void }) {
  const t = useTranslations();
  const { data } = useShell();
  const [type, setType] = useState<CaptureType>("task");

  useEffect(() => {
    if (preset) setType(preset.type ?? "task");
  }, [preset]);

  return (
    <Sheet open={!!preset} onClose={onClose} title={t("capture.title")}>
      <div role="tablist" aria-label={t("capture.title")} className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {TYPES.map(({ type: ty, icon: Icon }) => (
          <button
            key={ty}
            role="tab"
            aria-selected={type === ty}
            onClick={() => setType(ty)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
              type === ty ? "border-primary bg-primary text-on-primary" : "border-line text-ink-muted hover:bg-muted",
            )}
          >
            <Icon size={15} /> {t(`capture.${ty}`)}
          </button>
        ))}
      </div>
      {preset && <CaptureForm key={type + JSON.stringify(preset)} type={type} preset={preset} data={data} onDone={onClose} />}
      <p className="mt-3 hidden text-center text-xs text-ink-muted sm:block">{t("capture.hint")}</p>
    </Sheet>
  );
}

function CaptureForm({
  type,
  preset,
  data,
  onDone,
}: {
  type: CaptureType;
  preset: CapturePreset;
  data: ReturnType<typeof useShell>["data"];
  onDone: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string>();
  const first = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const ctx = data.contextFilter;

  // task state
  const [due, setDue] = useState<string | null>(preset.due_date !== undefined ? preset.due_date : data.today);
  // habit state
  const [freq, setFreq] = useState<"daily" | "weekdays" | "times_per_week">("daily");
  const [days, setDays] = useState<number[]>([]);
  const [kind, setKind] = useState<"task" | "follow_up">("task");

  useEffect(() => {
    const id = requestAnimationFrame(() => first.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const nextHour = String((Number(formatInTimeZone(new Date(), data.tz, "H")) + 1) % 24).padStart(2, "0") + ":00";
  const dayNames = weekdayNames(data.numerals, "short");
  const weekOrder = Array.from({ length: 7 }, (_, i) => (data.weekStart + i) % 7);

  function submit(form: FormData) {
    setError(undefined);
    const s = (k: string) => String(form.get(k) ?? "").trim();
    start(async () => {
      let res: { ok: boolean; error?: string; data?: { id: string } };
      let go: string | null = null;
      switch (type) {
        case "task":
          res = await createTask({
            title: s("title"),
            due_date: due,
            kind,
            owner_text: kind === "follow_up" ? s("owner") : null,
            project_id: s("project_id") || preset.project_id || null,
            milestone_id: preset.milestone_id ?? null,
            priority: (s("priority") || "none") as "none",
            context_id: s("project_id") || preset.project_id ? null : ctx,
          });
          break;
        case "project":
          res = await createProject({ name: s("title"), context_id: s("context_id") || ctx, target_date: s("target_date") || null, description: s("description") || null });
          if (res.ok && res.data) go = `/projects/${res.data.id}`;
          break;
        case "habit":
          res = await createHabit({
            name: s("title"),
            frequency_type: freq,
            weekdays: freq === "weekdays" ? days : null,
            times_per_week: freq === "times_per_week" ? Number(s("times") || 3) : null,
            target_value: s("target_value") ? Number(s("target_value")) : null,
            target_unit: s("target_unit") || null,
            preferred_time: s("preferred_time") || null,
            context_id: ctx,
            start_date: data.today,
          });
          break;
        case "meeting": {
          const day = s("day") || data.today;
          const time = s("time") || nextHour;
          const startsAt = fromZonedTime(`${day}T${time}:00`, data.tz);
          const mins = Number(s("duration") || 0);
          res = await createMeeting({
            title: s("title"),
            starts_at: startsAt.toISOString(),
            ends_at: mins > 0 ? new Date(startsAt.getTime() + mins * 60000).toISOString() : null,
            project_id: s("project_id") || preset.project_id || null,
            context_id: s("project_id") || preset.project_id ? null : ctx,
            location: s("location") || null,
            url: s("url") || null,
          });
          if (res.ok && res.data) go = `/meetings/${res.data.id}`;
          break;
        }
        default:
          res = await createNote({
            kind: type === "idea" ? "idea" : "note",
            body: s("title"),
            project_id: s("project_id") || preset.project_id || null,
            context_id: ctx,
          });
      }
      if (!res.ok) return setError(res.error);
      onDone();
      if (go) {
        router.push(go);
        toast.success(t(type === "project" ? "project.created" : "meeting.created"));
      } else {
        toast.success(t(type === "task" ? "task.added" : type === "habit" ? "habit.created" : "capture.added"));
      }
    });
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.requestSubmit();
  };

  const placeholder =
    type === "task" ? (kind === "follow_up" ? t("task.followUpPlaceholder") : t("task.titlePlaceholder"))
    : type === "project" ? t("project.namePlaceholder")
    : type === "habit" ? t("habit.namePlaceholder")
    : type === "meeting" ? t("meeting.titlePlaceholder")
    : type === "idea" ? t("capture.ideaPlaceholder")
    : t("capture.notePlaceholder");

  const projectSelect = (
    <Field label={t("task.project")} htmlFor="qc-project">
      <Select id="qc-project" name="project_id" defaultValue={preset.project_id ?? ""}>
        <option value="">{t("app.none")}</option>
        {data.projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
    </Field>
  );

  const chip = (on: boolean) =>
    cn("h-8 rounded-full border px-3 text-[13px] transition-colors", on ? "border-primary bg-primary-soft text-primary font-medium" : "border-line text-ink-muted hover:bg-muted");

  return (
    <form action={submit} onKeyDown={onKeyDown} className="space-y-4">
      {type === "note" || type === "idea" ? (
        <Textarea ref={first} name="title" required placeholder={placeholder} aria-label={placeholder} rows={4} maxLength={100000} />
      ) : (
        <Input ref={first} name="title" required placeholder={placeholder} aria-label={placeholder} maxLength={300} className="h-12 text-base" autoComplete="off" />
      )}

      {type === "task" && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("task.due")}>
          <CalendarClock size={16} className="me-1 text-ink-muted" aria-hidden />
          {[
            { v: data.today, l: t("task.today") },
            { v: addDays(data.today, 1), l: t("task.tomorrow") },
            { v: addDays(startOfWeek(data.today, data.weekStart), 7), l: t("task.nextWeek") },
            { v: null, l: t("task.noDate") },
          ].map((o) => (
            <button type="button" key={o.l} className={chip(due === o.v)} onClick={() => setDue(o.v)} aria-pressed={due === o.v}>
              {o.l}
            </button>
          ))}
          <input
            type="date"
            aria-label={t("task.due")}
            value={due ?? ""}
            onChange={(e) => setDue(e.target.value || null)}
            className="h-8 rounded-full border border-line bg-surface px-2 text-[13px] text-ink-muted"
          />
        </div>
      )}

      {type === "habit" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("habit.frequency")}>
            {(["daily", "weekdays", "times_per_week"] as const).map((f) => (
              <button type="button" role="radio" aria-checked={freq === f} key={f} className={chip(freq === f)} onClick={() => setFreq(f)}>
                {t(`habit.${f === "times_per_week" ? "timesPerWeek" : f}`)}
              </button>
            ))}
          </div>
          {freq === "weekdays" && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("habit.weekdays")}>
              {weekOrder.map((d) => (
                <button
                  type="button"
                  key={d}
                  aria-pressed={days.includes(d)}
                  onClick={() => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}
                  className={cn(chip(days.includes(d)), "w-12 px-0")}
                >
                  {dayNames[d]}
                </button>
              ))}
            </div>
          )}
          {freq === "times_per_week" && (
            <div className="flex items-center gap-2">
              <Input name="times" type="number" min={1} max={7} defaultValue={3} className="w-20" aria-label={t("habit.timesLabel")} />
              <span className="text-sm text-ink-muted">{t("habit.timesLabel")}</span>
            </div>
          )}
        </div>
      )}

      {type === "meeting" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("meeting.date")} htmlFor="qc-day">
            <Input id="qc-day" name="day" type="date" defaultValue={preset.starts_at_day ?? data.today} required />
          </Field>
          <Field label={t("meeting.time")} htmlFor="qc-time">
            <Input id="qc-time" name="time" type="time" defaultValue={nextHour} required />
          </Field>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMore((m) => !m)}
        aria-expanded={more}
        className="flex items-center gap-1 text-sm text-ink-muted hover:text-primary"
      >
        <ChevronDown size={16} className={cn("transition-transform", more && "rotate-180")} />
        {t("capture.moreOptions")}
      </button>

      {more && (
        <div className="animate-in grid gap-3 sm:grid-cols-2">
          {type === "task" && (
            <>
              {!preset.project_id && projectSelect}
              <Field label={t("task.priority")} htmlFor="qc-priority">
                <Select id="qc-priority" name="priority" defaultValue="none">
                  <option value="none">{t("task.priorityNone")}</option>
                  <option value="high">{t("task.priorityHigh")}</option>
                  <option value="medium">{t("task.priorityMedium")}</option>
                  <option value="low">{t("task.priorityLow")}</option>
                </Select>
              </Field>
              <Field label={t("task.kind")} htmlFor="qc-kind">
                <Select id="qc-kind" value={kind} onChange={(e) => setKind(e.target.value as "task")}>
                  <option value="task">{t("task.kindTask")}</option>
                  <option value="follow_up">{t("task.kindFollowUp")}</option>
                </Select>
              </Field>
              {kind === "follow_up" && (
                <Field label={t("task.owner")} htmlFor="qc-owner">
                  <Input id="qc-owner" name="owner" maxLength={80} />
                </Field>
              )}
            </>
          )}
          {type === "project" && (
            <>
              <Field label={t("task.context")} htmlFor="qc-ctx">
                <Select id="qc-ctx" name="context_id" defaultValue={ctx ?? ""}>
                  <option value="">{t("app.none")}</option>
                  {data.contexts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("project.targetDate")} htmlFor="qc-target">
                <Input id="qc-target" name="target_date" type="date" />
              </Field>
              <Field label={t("project.description")} htmlFor="qc-desc" className="sm:col-span-2">
                <Textarea id="qc-desc" name="description" rows={2} maxLength={2000} />
              </Field>
            </>
          )}
          {type === "habit" && (
            <>
              <Field label={t("habit.target")} htmlFor="qc-tv" hint={t("app.optional")}>
                <div className="flex gap-2">
                  <Input id="qc-tv" name="target_value" type="number" min={0} step="any" placeholder="10" className="w-24" />
                  <Input name="target_unit" placeholder={t("habit.unitPlaceholder")} aria-label={t("habit.targetUnit")} maxLength={30} />
                </div>
              </Field>
              <Field label={t("habit.time")} htmlFor="qc-ht" hint={t("app.optional")}>
                <Input id="qc-ht" name="preferred_time" type="time" />
              </Field>
            </>
          )}
          {type === "meeting" && (
            <>
              {!preset.project_id && projectSelect}
              <Field label={t("meeting.duration")} htmlFor="qc-dur">
                <Input id="qc-dur" name="duration" type="number" min={0} step={15} placeholder="60" />
              </Field>
              <Field label={t("meeting.location")} htmlFor="qc-loc">
                <Input id="qc-loc" name="location" maxLength={300} />
              </Field>
              <Field label={t("meeting.url")} htmlFor="qc-url">
                <Input id="qc-url" name="url" type="url" dir="ltr" placeholder="https://" />
              </Field>
            </>
          )}
          {(type === "note" || type === "idea") && !preset.project_id && projectSelect}
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={pending || (type === "habit" && freq === "weekdays" && days.length === 0)}>
        {pending ? t("app.saving") : t("app.add")}
      </Button>
    </form>
  );
}
