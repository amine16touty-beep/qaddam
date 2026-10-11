import "server-only";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/utils";

export async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return { supabase, user };
}

export function refresh() {
  revalidatePath("/", "layout");
}

/** Translate a DB / validation failure into a sentence the user understands. */
export async function failure(err: unknown): Promise<{ ok: false; error: string }> {
  const t = await getTranslations();
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  if (err instanceof z.ZodError) {
    const issue = err.issues[0];
    if (issue?.code === "too_big") return { ok: false, error: t("errors.tooLong") };
    if (issue?.message?.startsWith("errors.")) return { ok: false, error: t(issue.message as "errors.required") };
    return { ok: false, error: t("errors.required") };
  }
  if (msg.includes("PRIORITY_LIMIT")) return { ok: false, error: t("task.priorityLimit") };
  if (msg.includes("NOT_FOUND") || msg.includes("PGRST116")) return { ok: false, error: t("errors.notFound") };
  if (msg.includes("duplicate key")) return { ok: false, error: t("errors.duplicateName") };
  if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) return { ok: false, error: t("errors.network") };
  console.error("[action]", err);
  return { ok: false, error: t("errors.unknown") };
}

export async function act<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    refresh();
    return { ok: true, data };
  } catch (e) {
    return failure(e);
  }
}

/** Throw on a Supabase error so `act` can translate it. */
export function must<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error;
  if (res.data == null) throw new Error("NOT_FOUND");
  return res.data as NonNullable<T>;
}

/* shared zod pieces */
export const id = z.string().uuid();
export const optId = z.string().uuid().nullish().or(z.literal("").transform(() => null));
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "errors.invalidDate");
export const optDate = isoDate.nullish().or(z.literal("").transform(() => null));
export const optText = (max: number) =>
  z.string().max(max).nullish().transform((v) => (v == null || v.trim() === "" ? null : v.trim()));
export const reqText = (max: number) => z.string().trim().min(1, "errors.required").max(max);

/**
 * `.partial()` still applies `.default()` values, which would silently reset
 * fields the caller never touched. Keep only the keys actually sent.
 */
export function onlySent<T extends Record<string, unknown>>(parsed: T, sent: object): Partial<T> {
  const keys = new Set(Object.keys(sent));
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => keys.has(k))) as Partial<T>;
}
