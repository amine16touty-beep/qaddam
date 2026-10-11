"use server";
import { z } from "zod";
import { act, onlySent, authed, id, isoDate, must, optDate, optId, optText, reqText } from "./_helpers";

const taskInput = z.object({
  title: reqText(300),
  notes: optText(5000),
  kind: z.enum(["task", "follow_up"]).default("task"),
  due_date: optDate,
  due_time: z.string().regex(/^\d{2}:\d{2}$/).nullish().or(z.literal("").transform(() => null)),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  owner_text: optText(80),
  context_id: optId,
  project_id: optId,
  milestone_id: optId,
  priority_date: optDate,
});

export async function createTask(input: z.input<typeof taskInput>) {
  return act(async () => {
    const v = taskInput.parse(input);
    const { supabase } = await authed();
    return must(await supabase.from("tasks").insert(v).select("id, title").single());
  });
}

export async function updateTask(taskId: string, patch: Partial<z.input<typeof taskInput>>) {
  return act(async () => {
    const v = onlySent(taskInput.partial().parse(patch), patch);
    const { supabase } = await authed();
    must(await supabase.from("tasks").update(v).eq("id", id.parse(taskId)).select("id").single());
  });
}

export async function setTaskStatus(taskId: string, status: "todo" | "done" | "cancelled") {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("tasks").update({ status }).eq("id", id.parse(taskId)).select("id").single());
  });
}

export async function setTaskPriority(taskId: string, day: string | null) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("tasks").update({ priority_date: day ? isoDate.parse(day) : null }).eq("id", id.parse(taskId)).select("id").single());
  });
}

export async function moveTasks(taskIds: string[], due: string | null) {
  return act(async () => {
    const { supabase } = await authed();
    const ids = z.array(id).max(200).parse(taskIds);
    const res = await supabase.from("tasks").update({ due_date: due ? isoDate.parse(due) : null }).in("id", ids);
    if (res.error) throw res.error;
  });
}

export async function deleteTask(taskId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("tasks").update({ deleted_at: new Date().toISOString(), priority_date: null }).eq("id", id.parse(taskId)).select("id").single());
  });
}

export async function restoreTask(taskId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("tasks").update({ deleted_at: null }).eq("id", id.parse(taskId)).select("id").single());
  });
}
