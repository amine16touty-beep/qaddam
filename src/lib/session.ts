import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hourIn, todayIn } from "@/lib/domain/dates";
import type { Numerals } from "@/lib/format";

/** Everything a page needs about "who" and "when", fetched once per request. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const tz = profile?.timezone ?? "UTC";
  const ctx = (await cookies()).get("qaddam_ctx")?.value || null;

  return {
    supabase,
    user,
    profile,
    tz,
    today: todayIn(tz),
    hour: hourIn(tz),
    weekStart: profile?.week_start ?? 1,
    numerals: (profile?.numerals ?? "latn") as Numerals,
    contextFilter: ctx,
  };
});

export type Session = Awaited<ReturnType<typeof getSession>>;

export const getContexts = cache(async () => {
  const { supabase } = await getSession();
  const { data } = await supabase.from("contexts").select("*").eq("is_archived", false).order("position");
  return data ?? [];
});

export const getActiveProjects = cache(async () => {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from("projects")
    .select("id, name, context_id, status")
    .is("deleted_at", null)
    .in("status", ["planned", "active", "paused"])
    .order("last_activity_at", { ascending: false });
  return data ?? [];
});
