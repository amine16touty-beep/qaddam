"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, ArchiveRestore, LocateFixed } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { InlineAdd } from "@/components/ui/inline-add";
import { createContext, updateContext, updateProfile } from "@/app/actions/settings";
import { weekdayNames } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLORS = ["violet", "blue", "green", "orange", "rose", "gray"];

type Profile = { display_name: string; timezone: string; week_start: number; numerals: "latn" | "arab"; theme: "system" | "light" | "dark" };

export function ProfileForm({ profile, zones }: { profile: Profile; zones: string[] }) {
  const t = useTranslations("settings");
  const [, start] = useTransition();
  const save = (patch: Partial<Profile>) =>
    start(async () => {
      const r = await updateProfile(patch);
      if (!r.ok) return void toast.error(r.error);
      toast.success(t("saved"));
      if (patch.theme) {
        if (patch.theme === "system") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", patch.theme);
      }
    });
  const days = weekdayNames(profile.numerals, "long");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("displayName")} htmlFor="st-name">
        <Input id="st-name" defaultValue={profile.display_name} maxLength={80} onBlur={(e) => e.target.value !== profile.display_name && save({ display_name: e.target.value })} />
      </Field>
      <Field label={t("timezone")} htmlFor="st-tz" hint={t("timezoneHelp")}>
        <div className="flex gap-2">
          <Select id="st-tz" value={profile.timezone} onChange={(e) => save({ timezone: e.target.value })} dir="ltr">
            {!zones.includes(profile.timezone) && <option value={profile.timezone}>{profile.timezone}</option>}
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
          <Button variant="secondary" size="icon" aria-label={t("useDevice")} title={t("useDevice")} onClick={() => save({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>
            <LocateFixed size={16} />
          </Button>
        </div>
      </Field>
      <Field label={t("weekStart")} htmlFor="st-ws">
        <Select id="st-ws" value={profile.week_start} onChange={(e) => save({ week_start: Number(e.target.value) })}>
          {[1, 6, 0].map((d) => <option key={d} value={d}>{days[d]}</option>)}
        </Select>
      </Field>
      <Field label={t("numerals")} htmlFor="st-num">
        <Select id="st-num" value={profile.numerals} onChange={(e) => save({ numerals: e.target.value as "latn" })}>
          <option value="latn">{t("latn")}</option>
          <option value="arab">{t("arab")}</option>
        </Select>
      </Field>
      <Field label={t("theme")} htmlFor="st-theme">
        <Select id="st-theme" value={profile.theme} onChange={(e) => save({ theme: e.target.value as "system" })}>
          <option value="system">{t("system")}</option>
          <option value="light">{t("light")}</option>
          <option value="dark">{t("dark")}</option>
        </Select>
      </Field>
    </div>
  );
}

export function ContextsEditor({ contexts }: { contexts: { id: string; name: string; color: string; is_archived: boolean }[] }) {
  const t = useTranslations();
  const [, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
    });
  return (
    <div>
      <ul className="space-y-1">
        {contexts.map((c) => (
          <li key={c.id} className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5", c.is_archived && "opacity-50")}>
            <div className="flex gap-1" role="radiogroup" aria-label={c.name}>
              {COLORS.map((col) => (
                <button
                  key={col}
                  role="radio"
                  aria-checked={c.color === col}
                  aria-label={col}
                  onClick={() => run(() => updateContext(c.id, { color: col }))}
                  className={cn("h-5 w-5 rounded-full border-2", c.color === col ? "border-ink" : "border-transparent")}
                  style={{ background: `var(--ctx-${col})` }}
                />
              ))}
            </div>
            <input
              defaultValue={c.name}
              maxLength={40}
              aria-label={t("settings.contextName")}
              onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && run(() => updateContext(c.id, { name: e.target.value }))}
              className="h-9 min-w-0 flex-1 rounded-lg bg-transparent px-2 hover:bg-muted focus:bg-muted focus:outline-none"
            />
            <button aria-label={t("habit.archive")} onClick={() => run(() => updateContext(c.id, { is_archived: !c.is_archived }))} className="rounded p-1.5 text-ink-muted hover:bg-muted">
              {c.is_archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            </button>
          </li>
        ))}
      </ul>
      <InlineAdd
        placeholder={t("settings.addContext")}
        onAdd={async (name) => {
          const r = await createContext(name, COLORS[contexts.length % COLORS.length]);
          return r;
        }}
      />
    </div>
  );
}
