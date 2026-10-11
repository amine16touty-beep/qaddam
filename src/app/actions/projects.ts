"use server";
import { z } from "zod";
import { act, onlySent, authed, id, must, optDate, optId, optText, reqText } from "./_helpers";

const status = z.enum(["planned", "active", "paused", "completed", "cancelled"]);
const link = z.object({ title: z.string().trim().max(120), url: z.string().trim().url("errors.invalidUrl").max(2000) });

const projectInput = z
  .object({
    name: reqText(200),
    description: optText(2000),
    objective: optText(1000),
    context_id: optId,
    program_id: optId,
    goal_id: optId,
    status: status.default("active"),
    start_date: optDate,
    target_date: optDate,
    links: z.array(link).max(50).optional(),
  });

function checkDates(v: { start_date?: string | null; target_date?: string | null }) {
  if (v.start_date && v.target_date && v.target_date < v.start_date) throw new z.ZodError([{ code: "custom", message: "errors.endBeforeStart", path: ["target_date"], input: v }]);
}

export async function createProject(input: z.input<typeof projectInput>) {
  return act(async () => {
    const v = projectInput.parse(input);
    checkDates(v);
    const { supabase } = await authed();
    return must(await supabase.from("projects").insert(v).select("id, name").single());
  });
}

export async function updateProject(projectId: string, patch: Partial<z.input<typeof projectInput>>) {
  return act(async () => {
    const v = onlySent(projectInput.partial().parse(patch), patch);
    const { supabase } = await authed();
    if (v.start_date !== undefined || v.target_date !== undefined) {
      const cur = must(await supabase.from("projects").select("start_date, target_date").eq("id", id.parse(projectId)).single());
      checkDates({ ...cur, ...v });
    }
    must(await supabase.from("projects").update(v).eq("id", id.parse(projectId)).select("id").single());
  });
}

export async function deleteProject(projectId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id.parse(projectId)).select("id").single());
  });
}

export async function restoreProject(projectId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("projects").update({ deleted_at: null }).eq("id", id.parse(projectId)).select("id").single());
  });
}

/* milestones */
export async function createMilestone(projectId: string, title: string, due: string | null) {
  return act(async () => {
    const { supabase } = await authed();
    const v = z.object({ project_id: id, title: reqText(200), due_date: optDate }).parse({ project_id: projectId, title, due_date: due });
    const { count } = await supabase.from("milestones").select("id", { count: "exact", head: true }).eq("project_id", v.project_id);
    must(await supabase.from("milestones").insert({ ...v, position: count ?? 0 }).select("id").single());
  });
}

export async function toggleMilestone(milestoneId: string, done: boolean) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("milestones").update({ completed_at: done ? new Date().toISOString() : null }).eq("id", id.parse(milestoneId)).select("id").single());
  });
}

export async function updateMilestone(milestoneId: string, patch: { title?: string; due_date?: string | null }) {
  return act(async () => {
    const { supabase } = await authed();
    const v = z.object({ title: reqText(200).optional(), due_date: optDate.optional() }).parse(patch);
    must(await supabase.from("milestones").update(v).eq("id", id.parse(milestoneId)).select("id").single());
  });
}

export async function deleteMilestone(milestoneId: string) {
  return act(async () => {
    const { supabase } = await authed();
    const res = await supabase.from("milestones").delete().eq("id", id.parse(milestoneId));
    if (res.error) throw res.error;
  });
}

/* programs */
const programInput = z.object({
  name: reqText(200),
  description: optText(2000),
  context_id: optId,
  goal_id: optId,
  status: status.default("active"),
  start_date: optDate,
  target_date: optDate,
});

export async function createProgram(input: z.input<typeof programInput>) {
  return act(async () => {
    const v = programInput.parse(input);
    checkDates(v);
    const { supabase } = await authed();
    return must(await supabase.from("programs").insert(v).select("id, name").single());
  });
}

export async function updateProgram(programId: string, patch: Partial<z.input<typeof programInput>>) {
  return act(async () => {
    const v = onlySent(programInput.partial().parse(patch), patch);
    const { supabase } = await authed();
    must(await supabase.from("programs").update(v).eq("id", id.parse(programId)).select("id").single());
  });
}

export async function deleteProgram(programId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("programs").update({ deleted_at: new Date().toISOString() }).eq("id", id.parse(programId)).select("id").single());
    // projects keep living on their own
    await supabase.from("projects").update({ program_id: null }).eq("program_id", programId);
  });
}
