"use server";
import { act, authed, must } from "./_helpers";

/** A fresh private feed link. Calling it again replaces the token, so the old link stops working. */
export async function resetCalendarToken() {
  return act(async () => {
    const { supabase, user } = await authed();
    const token = crypto.randomUUID();
    must(await supabase.from("profiles").update({ calendar_token: token }).eq("id", user.id).select("id").single());
    return token;
  });
}

export async function disableCalendarFeed() {
  return act(async () => {
    const { supabase, user } = await authed();
    must(await supabase.from("profiles").update({ calendar_token: null }).eq("id", user.id).select("id").single());
  });
}
