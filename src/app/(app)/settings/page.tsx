import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, Download, Keyboard, Trash2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { buttonClass, Card, CardHeader, PageHeader } from "@/components/ui";
import { ContextsEditor, ProfileForm } from "@/components/settings/settings-client";
import { signOut } from "@/app/actions/settings";

export const metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  const s = await getSession();
  const t = await getTranslations();
  const { data: contexts } = await s.supabase.from("contexts").select("id, name, color, is_archived").order("position");
  const zones = Intl.supportedValuesOf("timeZone");
  return (
    <div className="space-y-5">
      <PageHeader title={t("settings.title")} subtitle={s.user.email} />
      <Card>
        <CardHeader title={t("settings.profile")} />
        <div className="px-4 pb-4">
          <ProfileForm profile={{ display_name: s.profile?.display_name ?? "", timezone: s.tz, week_start: s.weekStart, numerals: s.numerals, theme: (s.profile?.theme ?? "system") as "system" }} zones={zones} />
        </div>
      </Card>
      <Card>
        <CardHeader title={t("settings.contexts")} />
        <div className="px-4 pb-4">
          <p className="mb-3 text-sm text-ink-muted">{t("settings.contextsHelp")}</p>
          <ContextsEditor contexts={contexts ?? []} />
        </div>
      </Card>
      <Card>
        <CardHeader title={t("settings.data")} />
        <div className="space-y-3 px-4 pb-4">
          <p className="text-sm text-ink-muted">{t("settings.exportHelp")}</p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/export?format=json" className={buttonClass("secondary")} download><Download size={16} /> {t("settings.export")}</a>
            <a href="/api/export?format=csv" className={buttonClass("secondary")} download><Download size={16} /> {t("settings.exportCsv")}</a>
          </div>
          <Link href="/settings/trash" className="flex items-center justify-between rounded-xl border border-line px-3 py-3 text-sm hover:bg-muted">
            <span className="flex items-center gap-2"><Trash2 size={16} className="text-ink-muted" /> {t("settings.trash")}</span>
            <ChevronLeft size={16} className="text-ink-muted" />
          </Link>
        </div>
      </Card>
      <Card className="hidden sm:block">
        <CardHeader title={t("settings.shortcuts")} icon={<Keyboard size={17} className="text-ink-muted" />} />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 pb-4 text-sm">
          {[["N", t("settings.shortcutNew")], ["M", t("settings.shortcutMeeting")], ["/  ·  Ctrl K", t("settings.shortcutSearch")], ["G T · G P · G C · G R", `${t("nav.today")} · ${t("nav.projects")} · ${t("nav.calendar")} · ${t("nav.progress")}`]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-line pb-2">
              <dt className="text-ink-muted">{v}</dt>
              <dd><kbd dir="ltr" className="rounded border border-line bg-muted px-2 py-0.5 text-xs">{k}</kbd></dd>
            </div>
          ))}
        </dl>
      </Card>
      <form action={signOut} className="lg:hidden">
        <button className={buttonClass("secondary", "lg", "w-full")}>{t("nav.signOut")}</button>
      </form>
    </div>
  );
}
