"use server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { act, authed, must } from "./_helpers";
import { pushConfigured, sendPush } from "@/lib/push";

const subInput = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  device: z.string().max(120).optional(),
});

export async function savePushSubscription(input: z.input<typeof subInput>) {
  return act(async () => {
    const v = subInput.parse(input);
    const { supabase, user } = await authed();
    must(
      await supabase
        .from("push_subscriptions")
        .upsert({ user_id: user.id, endpoint: v.endpoint, p256dh: v.keys.p256dh, auth: v.keys.auth, device: v.device ?? null }, { onConflict: "endpoint" })
        .select("id")
        .single(),
    );
  });
}

export async function deletePushSubscription(endpoint: string) {
  return act(async () => {
    const { supabase } = await authed();
    await supabase.from("push_subscriptions").delete().eq("endpoint", z.string().max(1000).parse(endpoint));
  });
}

/** "Send me a test" so the person sees it work end to end on this device. */
export async function sendTestPush(endpoint: string) {
  return act(async () => {
    if (!pushConfigured()) throw new Error("PUSH_NOT_CONFIGURED");
    const t = await getTranslations("notify");
    const { supabase } = await authed();
    const { data: sub } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("endpoint", endpoint).maybeSingle();
    if (!sub) throw new Error("NOT_FOUND");
    const r = await sendPush(sub, { title: t("testTitle"), body: t("testBody"), url: "/today", tag: "test" });
    if (r !== "ok") throw new Error("PUSH_FAILED");
  });
}
