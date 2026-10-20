"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarPlus, Copy, Link2Off, RefreshCw } from "lucide-react";
import { Button, buttonClass, Input } from "@/components/ui";
import { disableCalendarFeed, resetCalendarToken } from "@/app/actions/calendar";
import { googleSubscribeUrl } from "@/lib/domain/calendar";

export function CalendarSync({ token: initial, origin }: { token: string | null; origin: string }) {
  const t = useTranslations("gcal");
  const [token, setToken] = useState(initial);
  const [busy, start] = useTransition();
  const feed = token ? `${origin}/api/calendar/${token}.ics` : null;

  const create = () =>
    start(async () => {
      const r = await resetCalendarToken();
      if (!r.ok) return void toast.error(r.error);
      setToken(r.data ?? null);
      if (token) toast.success(t("renewed"));
    });

  const stop = () =>
    start(async () => {
      const r = await disableCalendarFeed();
      if (!r.ok) return void toast.error(r.error);
      setToken(null);
    });

  const copy = async () => {
    if (!feed) return;
    await navigator.clipboard.writeText(feed).then(() => toast.success(t("copied")), () => toast.error(t("copyFailed")));
  };

  if (!feed)
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">{t("intro")}</p>
        <Button onClick={create} disabled={busy}><CalendarPlus size={16} /> {t("create")}</Button>
      </div>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">{t("ready")}</p>
      <a href={googleSubscribeUrl(feed)} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
        <CalendarPlus size={16} /> {t("addToGoogle")}
      </a>
      <div className="flex gap-2">
        <Input readOnly value={feed} dir="ltr" aria-label={t("link")} onFocus={(e) => e.target.select()} className="h-10 min-w-0 flex-1 text-xs" />
        <Button variant="secondary" onClick={copy} aria-label={t("copy")}><Copy size={15} /> {t("copy")}</Button>
      </div>
      <ul className="list-disc space-y-1 ps-5 text-sm text-ink-muted">
        <li>{t("delay")}</li>
        <li>{t("private")}</li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={create} disabled={busy}><RefreshCw size={14} /> {t("renew")}</Button>
        <Button variant="ghost" size="sm" onClick={stop} disabled={busy}><Link2Off size={14} /> {t("stop")}</Button>
      </div>
    </div>
  );
}
