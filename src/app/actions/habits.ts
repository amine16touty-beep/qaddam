"use server";
import { z } from "zod";
import { act, authed, id, isoDate, must, optId, optText, reqText } from "./_helpers";

const habitInput = z
  .object({
    name: reqText(120),
    frequency_type: z.enum(["daily", "weekdays", "times_per_week"]),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).nullish(),
    times_per_week: z.number().int().min(1).max(7).nullish(),
    target_value: z.number().positive().max(100000).nullish(),
    target_unit: optText(30),
    preferred_time: z.string().regex(/^\d{2}:\d{2}$/).nullish().or(z.literal("").transform(() => null)),
    context_id: optId,
    goal_id: optId,
    start_date: isoDate.optional(),
  })
  .transform((v) => ({
    ...v,
    weekdays: v.frequency_type === "weekdays" ? [...new Set(v.weekdays ?? [])].sort() : null,
    times_per_week: v.frequency_type === "times_per_week" ? (v.times_per_week ?? 3) : null,
  }));

export async function createHabit(input: z.input<typeof habitInput>) {
  return act(async () => {
    const v = habitInput.parse(input);
    if (v.frequency_type === "weekdays" && !v.weekdays?.length) throw new z.ZodError([{ code: "custom", message: "errors.required", path: ["weekdays"], input }]);
    const { supabase } = await authed();
    return must(await supabase.from("habits").insert(v).select("id, name").single());
  });
}

export async function updateHabit(habitId: string, input: z.input<typeof habitInput>) {
  return act(async () => {
    const v = habitInput.parse(input);
    const { supabase } = await authed();
    must(await supabase.from("habits").update(v).eq("id", id.parse(habitId)).select("id").single());
  });
}

/** One tap = full target (or 1). Upsert keeps a single row per day. */
export async function logHabit(habitId: string, day: string, value: number | null) {
  return act(async () => {
    const { supabase } = await authed();
    const hid = id.parse(habitId);
    const d = isoDate.parse(day);
    if (value === null || value <= 0) {
      const res = await supabase.from("habit_logs").delete().eq("habit_id", hid).eq("log_date", d);
      if (res.error) throw res.error;
      return;
    }
    must(
      await supabase
        .from("habit_logs")
        .upsert({ habit_id: hid, log_date: d, value: z.number().positive().max(100000).parse(value) }, { onConflict: "habit_id,log_date" })
        .select("id")
        .single(),
    );
  });
}

export async function archiveHabit(habitId: string, archived: boolean) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("habits").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id.parse(habitId)).select("id").single());
  });
}

export async function deleteHabit(habitId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("habits").update({ deleted_at: new Date().toISOString() }).eq("id", id.parse(habitId)).select("id").single());
  });
}

export async function restoreHabit(habitId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("habits").update({ deleted_at: null }).eq("id", id.parse(habitId)).select("id").single());
  });
}
