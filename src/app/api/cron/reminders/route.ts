import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fromZonedTime } from "date-fns-tz";
import { pushConfigured, sendPush, type PushPayload } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Called every minute by Supabase pg_cron (see README). Finds meetings and timed tasks whose
 * reminder moment has come, pushes them to every device of their owner, and marks them reminded.
 * Uses the service-role key: it must read across users, so it only ever runs with the CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("unauthorized", { status: 401 });
  if (!pushConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = Date.now();
  const due: { table: "meetings" | "tasks"; id: string; user: string; payload: PushPayload }[] = [];

  // Meetings: remind `remind_meetings_min` before the start (max lead is 2h). Skip ones that already started.
  const { data: meetings, error } = await db
    .from("meetings")
    .select("id, user_id, title, starts_at, location")
    .is("reminded_at", null)
    .is("deleted_at", null)
    .gt("starts_at", new Date(now).toISOString())
    .lte("starts_at", new Date(now + 121 * 60_000).toISOString())
    .limit(500);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const day = (offset: number) => new Date(now + offset * 86_400_000).toISOString().slice(0, 10);
  const { data: tasks } = await db
    .from("tasks")
    .select("id, user_id, title, due_date, due_time, kind")
    .is("reminded_at", null)
    .is("deleted_at", null)
    .eq("status", "todo")
    .not("due_time", "is", null)
    .gte("due_date", day(-1))
    .lte("due_date", day(1))
    .limit(500);

  // profiles and meetings/tasks both point at auth.users, so PostgREST can't embed one in the other
  const owners = [...new Set([...(meetings ?? []), ...(tasks ?? [])].map((r) => r.user_id))];
  const { data: profs } = owners.length
    ? await db.from("profiles").select("id, timezone, remind_meetings_min, remind_tasks").in("id", owners)
    : { data: [] };
  const prof = new Map((profs ?? []).map((p) => [p.id, p]));

  for (const m of meetings ?? []) {
    const lead = prof.get(m.user_id)?.remind_meetings_min ?? 0;
    if (!lead) continue;
    const mins = Math.round((new Date(m.starts_at).getTime() - now) / 60_000);
    if (mins > lead) continue;
    due.push({
      table: "meetings",
      id: m.id,
      user: m.user_id,
      payload: {
        title: m.title,
        body: `${mins <= 1 ? "يبدأ الآن" : `بعد ${mins} دقيقة`}${m.location ? ` · ${m.location}` : ""}`,
        url: `/meetings/${m.id}`,
        tag: `m-${m.id}`,
      },
    });
  }

  // Tasks with a time: remind at that time in the owner's timezone (up to 30 min late, never for old ones).
  for (const t of tasks ?? []) {
    const p = prof.get(t.user_id);
    if (!p?.remind_tasks) continue;
    const at = fromZonedTime(`${t.due_date}T${String(t.due_time).slice(0, 5)}:00`, p.timezone || "UTC").getTime();
    if (at > now || now - at > 30 * 60_000) continue;
    due.push({
      table: "tasks",
      id: t.id,
      user: t.user_id,
      payload: { title: t.title, body: t.kind === "follow_up" ? "حان وقت المتابعة" : "حان وقت هذه المهمة", url: `/tasks?open=${t.id}`, tag: `t-${t.id}` },
    });
  }

  if (!due.length) return NextResponse.json({ ok: true, sent: 0 });

  const users = [...new Set(due.map((d) => d.user))];
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").in("user_id", users);
  let sent = 0;
  const gone: string[] = [];
  for (const d of due) {
    // mark first so an overlapping run can never double-send
    const { data: claimed } = await db.from(d.table).update({ reminded_at: new Date().toISOString() }).eq("id", d.id).is("reminded_at", null).select("id");
    if (!claimed?.length) continue;
    for (const s of (subs ?? []).filter((x) => x.user_id === d.user)) {
      const r = await sendPush(s, d.payload);
      if (r === "ok") sent++;
      if (r === "gone") gone.push(s.endpoint);
    }
  }
  if (gone.length) await db.from("push_subscriptions").delete().in("endpoint", gone);
  return NextResponse.json({ ok: true, due: due.length, sent });
}
