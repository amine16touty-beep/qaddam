"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { act, authed, id, must, onlySent, optText, reqText } from "./_helpers";

const profileInput = z.object({
  display_name: optText(80),
  timezone: z.string().min(1).max(64).optional(),
  week_start: z.number().int().min(0).max(6).optional(),
  numerals: z.enum(["latn", "arab"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  remind_meetings_min: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15), z.literal(30), z.literal(60), z.literal(120)]).optional(),
  remind_tasks: z.boolean().optional(),
});

export async function updateProfile(patch: z.input<typeof profileInput>) {
  return act(async () => {
    // only the fields sent: optText turns a missing display_name into null otherwise
    const v = onlySent(profileInput.parse(patch), patch);
    const { supabase, user } = await authed();
    must(await supabase.from("profiles").update(v).eq("id", user.id).select("id").single());
    if (v.theme) (await cookies()).set("qaddam_theme", v.theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  });
}

/** Silently align the profile timezone with the device on first use. */
export async function syncTimezone(tz: string) {
  return act(async () => {
    const { supabase, user } = await authed();
    const { data } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
    if (data?.timezone === "UTC" && tz !== "UTC") {
      await supabase.from("profiles").update({ timezone: z.string().max(64).parse(tz) }).eq("id", user.id);
    }
  });
}

export async function setContextFilter(contextId: string | null) {
  const c = await cookies();
  if (contextId) c.set("qaddam_ctx", id.parse(contextId), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  else c.delete("qaddam_ctx");
  return act(async () => undefined);
}

/* contexts */
export async function createContext(name: string, color: string) {
  return act(async () => {
    const { supabase } = await authed();
    const { count } = await supabase.from("contexts").select("id", { count: "exact", head: true });
    must(await supabase.from("contexts").insert({ name: reqText(40).parse(name), color: z.string().max(20).parse(color), position: count ?? 0 }).select("id").single());
  });
}

export async function updateContext(contextId: string, patch: { name?: string; color?: string; is_archived?: boolean }) {
  return act(async () => {
    const { supabase } = await authed();
    const v = z.object({ name: reqText(40).optional(), color: z.string().max(20).optional(), is_archived: z.boolean().optional() }).parse(patch);
    must(await supabase.from("contexts").update(v).eq("id", id.parse(contextId)).select("id").single());
  });
}

/* trash */
const TRASH = ["tasks", "projects", "meetings", "notes", "habits", "programs", "goals"] as const;
type TrashTable = (typeof TRASH)[number];

export async function restoreItem(table: TrashTable, itemId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from(z.enum(TRASH).parse(table)).update({ deleted_at: null }).eq("id", id.parse(itemId)).select("id").single());
  });
}

export async function purgeItem(table: TrashTable, itemId: string) {
  return act(async () => {
    const { supabase } = await authed();
    // only items already in the trash can be removed for good
    const res = await supabase.from(z.enum(TRASH).parse(table)).delete().eq("id", id.parse(itemId)).not("deleted_at", "is", null);
    if (res.error) throw res.error;
  });
}

/* weekly review */
export async function saveWeeklyReview(weekStart: string, focus: string[], reflection: string) {
  return act(async () => {
    const { supabase } = await authed();
    const v = z
      .object({ week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), focus: z.array(z.string().trim().max(200)).max(3), reflection: z.string().max(5000) })
      .parse({ week_start: weekStart, focus: focus.map((f) => f.trim()).filter(Boolean), reflection });
    must(await supabase.from("weekly_reviews").upsert(v, { onConflict: "user_id,week_start" }).select("id").single());
  });
}

export async function signOut() {
  const { supabase } = await authed();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function searchAll(q: string) {
  const { supabase } = await authed();
  const query = z.string().trim().min(1).max(100).safeParse(q);
  if (!query.success) return [];
  const { data, error } = await supabase.rpc("search_all", { q: query.data, max_per_kind: 6 });
  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

