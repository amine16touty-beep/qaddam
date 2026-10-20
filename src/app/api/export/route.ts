import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLES = ["profiles", "contexts", "goals", "programs", "projects", "milestones", "tasks", "habits", "habit_logs", "meetings", "decisions", "notes", "weekly_reviews", "activity_logs"] as const;

/** Full personal export. RLS guarantees only the caller's rows are returned. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const user = auth?.claims ? { id: auth.claims.sub, email: auth.claims.email } : null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const stamp = new Date().toISOString().slice(0, 10);

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const { data } = await supabase
      .from("tasks")
      .select("title, status, kind, priority, due_date, due_time, owner_text, completed_at, created_at, project:projects(name), meeting:meetings(title), deleted_at")
      .order("created_at");
    const head = ["title", "status", "kind", "priority", "due_date", "due_time", "owner", "project", "meeting", "completed_at", "created_at", "deleted"];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = (data ?? []).map((r) =>
      [r.title, r.status, r.kind, r.priority, r.due_date, r.due_time, r.owner_text, (r.project as { name?: string } | null)?.name, (r.meeting as { title?: string } | null)?.title, r.completed_at, r.created_at, r.deleted_at ? "yes" : ""].map(esc).join(","),
    );
    return new NextResponse("﻿" + [head.join(","), ...lines].join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="qaddam-tasks-${stamp}.csv"` },
    });
  }

  const out: Record<string, unknown> = { app: "qaddam", version: 1, exported_at: new Date().toISOString(), user: { id: user.id, email: user.email } };
  for (const table of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    out[table] = rows;
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="qaddam-export-${stamp}.json"`, "Cache-Control": "no-store" },
  });
}
