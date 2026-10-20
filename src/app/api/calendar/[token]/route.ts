import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { buildIcs } from "@/lib/domain/calendar";

export const dynamic = "force-dynamic";

/**
 * The private .ics feed Google Calendar subscribes to. No session: the calendar app fetches it
 * on its own, so the random token in the link is the only key (see `calendar_feed` in SQL).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return new NextResponse("not found", { status: 404 });

  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("calendar_feed", { p_token: token });
  if (error) return new NextResponse("error", { status: 500 });

  // an unknown token gets an empty calendar too, so a revoked link just goes quiet
  const ics = buildIcs(data ?? [], { appUrl: req.nextUrl.origin, timezone: data?.[0]?.timezone ?? "UTC" });
  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="qaddam.ics"',
      "cache-control": "no-store",
    },
  });
}
