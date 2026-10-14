import "server-only";
import webpush from "web-push";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

export function pushConfigured() {
  return Boolean((process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY) && process.env.VAPID_PRIVATE_KEY);
}

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply@qaddam.app",
    (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY)!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  ready = true;
}

/** Sends to one device. Returns "gone" when the browser revoked the subscription, so the caller can delete it. */
export async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: PushPayload) {
  setup();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
      TTL: 60 * 30,
      urgency: "high",
    });
    return "ok" as const;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return "gone" as const;
    console.error("[push]", code, (e as Error).message);
    return "error" as const;
  }
}
