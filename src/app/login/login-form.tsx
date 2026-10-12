"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm({ initialError }: { initialError?: string }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState(initialError);
  const [info, setInfo] = useState<string>();
  const [pending, start] = useTransition();

  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  function submit(form: FormData) {
    setError(undefined);
    setInfo(undefined);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    start(async () => {
      const supabase = createClient();
      if (mode === "signup") {
        if (password.length < 8) return setError(t("weak"));
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name, timezone: tz() }, emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) return setError(error.message.toLowerCase().includes("registered") ? t("exists") : t("generic"));
        if (!data.session) return setInfo(t("magicSent"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setError(error.message.toLowerCase().includes("invalid") ? t("invalid") : t("generic"));
      }
      // full load: the new auth cookies reach the server once, with no client refresh racing the first render
      window.location.replace("/today");
    });
  }

  function magic(form: HTMLFormElement) {
    const email = String(new FormData(form).get("email") ?? "").trim();
    if (!email) return form.reportValidity();
    setError(undefined);
    start(async () => {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback`, data: { timezone: tz() } },
      });
      if (error) setError(t("generic"));
      else setInfo(t("magicSent"));
    });
  }

  return (
    <form action={submit} className="space-y-4" noValidate={false}>
      {mode === "signup" && (
        <Field label={t("name")} htmlFor="name">
          <Input id="name" name="name" autoComplete="given-name" placeholder={t("namePlaceholder")} maxLength={80} />
        </Field>
      )}
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label={t("password")} htmlFor="password" hint={mode === "signup" ? t("passwordHint") : undefined}>
        <Input
          id="password"
          name="password"
          type="password"
          dir="ltr"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </Field>

      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {info && <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{info}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {mode === "signin" ? t("signIn") : t("signUp")}
      </Button>
      {mode === "signin" && (
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={(e) => magic(e.currentTarget.form!)}
        >
          <Mail size={18} /> {t("magicLink")}
        </Button>
      )}
      <p className="pt-2 text-center text-sm text-ink-muted">
        {mode === "signin" ? t("noAccount") : t("haveAccount")}{" "}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(undefined);
            setInfo(undefined);
          }}
        >
          {mode === "signin" ? t("signUp") : t("signIn")}
        </button>
      </p>
    </form>
  );
}
