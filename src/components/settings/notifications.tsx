"use client";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, BellOff, Send, Share } from "lucide-react";
import { Button, Field, Select } from "@/components/ui";
import { updateProfile } from "@/app/actions/settings";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/app/actions/push";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Browser";
}

export function NotificationSettings({ remindMeetingsMin, remindTasks }: { remindMeetingsMin: number; remindTasks: boolean }) {
  const t = useTranslations("notify");
  const [state, setState] = useState<State>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setEndpoint(sub?.endpoint ?? null);
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = () =>
    start(async () => {
      try {
        await subscribe();
      } catch {
        toast.error(t("failed"));
      }
    });

  const subscribe = async () => {
      if (!vapid) return void toast.error(t("notConfigured"));
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapid) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys, device: deviceName() });
      if (!r.ok) return void toast.error(r.error);
      setEndpoint(json.endpoint);
      setState("on");
      toast.success(t("enabled"));
  };

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpoint(null);
      setState("off");
    });

  const test = () =>
    start(async () => {
      if (!endpoint) return;
      const r = await sendTestPush(endpoint);
      if (!r.ok) toast.error(r.error);
      else toast.success(t("testSent"));
    });

  const save = (patch: { remind_meetings_min?: 0 | 5 | 10 | 15 | 30 | 60 | 120; remind_tasks?: boolean }) =>
    start(async () => {
      const r = await updateProfile(patch);
      if (!r.ok) toast.error(r.error);
      else toast.success(t("saved"));
    });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line p-3">
        {state === "loading" && <p className="text-sm text-ink-muted">…</p>}
        {state === "on" && (
          <div className="flex flex-wrap items-center gap-2">
            <Bell size={18} className="text-success" />
            <span className="flex-1 text-sm">{t("onThisDevice")}</span>
            <Button variant="secondary" onClick={test} disabled={busy}><Send size={15} /> {t("test")}</Button>
            <Button variant="ghost" onClick={disable} disabled={busy}><BellOff size={15} /> {t("disable")}</Button>
          </div>
        )}
        {state === "off" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 text-sm text-ink-muted">{t("offThisDevice")}</span>
            <Button onClick={enable} disabled={busy}><Bell size={15} /> {t("enable")}</Button>
          </div>
        )}
        {state === "ios-install" && (
          <p className="flex items-start gap-2 text-sm text-ink-muted"><Share size={16} className="mt-0.5 shrink-0" /> {t("iosInstall")}</p>
        )}
        {state === "denied" && <p className="text-sm text-warning">{t("denied")}</p>}
        {state === "unsupported" && <p className="text-sm text-ink-muted">{t("unsupported")}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("meetingsLabel")} htmlFor="nt-m">
          <Select id="nt-m" defaultValue={remindMeetingsMin} onChange={(e) => save({ remind_meetings_min: Number(e.target.value) as 15 })}>
            <option value={0}>{t("never")}</option>
            {[5, 10, 15, 30, 60, 120].map((m) => <option key={m} value={m}>{t("minutesBefore", { m })}</option>)}
          </Select>
        </Field>
        <Field label={t("tasksLabel")} htmlFor="nt-t" hint={t("tasksHint")}>
          <Select id="nt-t" defaultValue={remindTasks ? "1" : "0"} onChange={(e) => save({ remind_tasks: e.target.value === "1" })}>
            <option value="1">{t("atTime")}</option>
            <option value="0">{t("never")}</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}
