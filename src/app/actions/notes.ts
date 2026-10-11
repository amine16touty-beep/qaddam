"use server";
import { z } from "zod";
import { act, onlySent, authed, id, must, optId, optText } from "./_helpers";

const noteInput = z.object({
  kind: z.enum(["note", "idea"]).default("note"),
  title: optText(200),
  body: z.string().max(100000).default(""),
  project_id: optId,
  meeting_id: optId,
  context_id: optId,
  pinned: z.boolean().optional(),
});

export async function createNote(input: z.input<typeof noteInput>) {
  return act(async () => {
    const v = noteInput.parse(input);
    if (!v.title && !v.body.trim()) throw new z.ZodError([{ code: "custom", message: "errors.required", path: ["body"], input }]);
    const { supabase } = await authed();
    return must(await supabase.from("notes").insert(v).select("id").single());
  });
}

export async function updateNote(noteId: string, patch: Partial<z.input<typeof noteInput>>) {
  return act(async () => {
    const v = onlySent(noteInput.partial().parse(patch), patch);
    const { supabase } = await authed();
    must(await supabase.from("notes").update(v).eq("id", id.parse(noteId)).select("id").single());
  });
}

export async function deleteNote(noteId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id.parse(noteId)).select("id").single());
  });
}

export async function restoreNote(noteId: string) {
  return act(async () => {
    const { supabase } = await authed();
    must(await supabase.from("notes").update({ deleted_at: null }).eq("id", id.parse(noteId)).select("id").single());
  });
}
