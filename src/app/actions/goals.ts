"use server";
import { z } from "zod";
import { act, onlySent, authed, id, must, optDate, optId, optText, reqText } from "./_helpers";

const goalInput = z.object({
  title: reqText(200),
  description: optText(2000),
  context_id: optId,
  target_date: optDate,
  status: z.enum(["active", "achieved", "dropped"]).default("active"),
});

export async function createGoal(input: z.input<typeof goalInput>) {
  return act(async () => {
    const v = goalInput.parse(input);
    const { supabase } = await authed();
    return must(await supabase.from("goals").insert(v).select("id").single());
  });
}

export async function updateGoal(goalId: string, patch: Partial<z.input<typeof goalInput>>) {
  return act(async () => {
    const v = onlySent(goalInput.partial().parse(patch), patch);
    const { supabase } = await authed();
    must(await supabase.from("goals").update(v).eq("id", id.parse(goalId)).select("id").single());
  });
}

export async function deleteGoal(goalId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("goals").update({ deleted_at: new Date().toISOString() }).eq("id", id.parse(goalId)).select("id").single());
  });
}
