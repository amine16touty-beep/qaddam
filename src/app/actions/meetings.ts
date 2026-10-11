"use server";
import { z } from "zod";
import { act, onlySent, authed, id, must, optDate, optId, optText, reqText } from "./_helpers";

const meetingInput = z.object({
  title: reqText(200),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).nullish(),
  location: optText(300),
  url: z.string().trim().url("errors.invalidUrl").max(2000).nullish().or(z.literal("").transform(() => null)),
  project_id: optId,
  context_id: optId,
  participants: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  agenda: z.string().max(20000).optional(),
  notes: z.string().max(100000).optional(),
});

export async function createMeeting(input: z.input<typeof meetingInput>) {
  return act(async () => {
    const v = meetingInput.parse(input);
    const { supabase } = await authed();
    return must(await supabase.from("meetings").insert(v).select("id, title").single());
  });
}

export async function updateMeeting(meetingId: string, patch: Partial<z.input<typeof meetingInput>>) {
  return act(async () => {
    const v = onlySent(meetingInput.partial().parse(patch), patch);
    if (v.ends_at && v.starts_at && v.ends_at < v.starts_at) throw new z.ZodError([{ code: "custom", message: "errors.endBeforeStart", path: ["ends_at"], input: patch }]);
    const { supabase } = await authed();
    must(await supabase.from("meetings").update(v).eq("id", id.parse(meetingId)).select("id").single());
  });
}

export async function deleteMeeting(meetingId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("meetings").update({ deleted_at: new Date().toISOString() }).eq("id", id.parse(meetingId)).select("id").single());
  });
}

export async function restoreMeeting(meetingId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("meetings").update({ deleted_at: null }).eq("id", id.parse(meetingId)).select("id").single());
  });
}

/* decisions */
const decisionInput = z.object({
  text: reqText(1000),
  action: optText(300),
  owner_text: optText(80),
  due_date: optDate,
});

export async function createDecision(meetingId: string, input: z.input<typeof decisionInput>) {
  return act(async () => {
    const v = decisionInput.parse(input);
    const { supabase } = await authed();
    const mid = id.parse(meetingId);
    const { count } = await supabase.from("decisions").select("id", { count: "exact", head: true }).eq("meeting_id", mid);
    return must(await supabase.from("decisions").insert({ ...v, meeting_id: mid, position: count ?? 0 }).select("id").single());
  });
}

export async function updateDecision(decisionId: string, patch: Partial<z.input<typeof decisionInput>>) {
  return act(async () => {
    const v = onlySent(decisionInput.partial().parse(patch), patch);
    const { supabase } = await authed();
    must(await supabase.from("decisions").update(v).eq("id", id.parse(decisionId)).select("id").single());
  });
}

export async function deleteDecision(decisionId: string) {
  return act(async () => {
    const { supabase } = await authed();
    const res = await supabase.from("decisions").delete().eq("id", id.parse(decisionId));
    if (res.error) throw res.error;
  });
}

/** Idempotent: converting the same decision twice returns the same task. */
export async function convertDecision(decisionId: string) {
  return act(async () => {
    const { supabase } = await authed();
    const task = must(await supabase.rpc("convert_decision_to_task", { p_decision_id: id.parse(decisionId) }));
    return { id: task.id, title: task.title };
  });
}

export async function convertAllDecisions(meetingId: string) {
  return act(async () => {
    const { supabase } = await authed();
    const mid = id.parse(meetingId);
    const decisions = must(await supabase.from("decisions").select("id").eq("meeting_id", mid));
    const existing = must(await supabase.from("tasks").select("decision_id").eq("meeting_id", mid).not("decision_id", "is", null));
    const done = new Set(existing.map((t) => t.decision_id));
    let created = 0;
    for (const d of decisions) {
      if (done.has(d.id)) continue;
      must(await supabase.rpc("convert_decision_to_task", { p_decision_id: d.id }));
      created++;
    }
    return { created };
  });
}
