import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("signIn") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations();
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <Logo />
        <p className="mt-6 text-2xl font-semibold leading-snug">{t("app.tagline")}</p>
        <p className="mt-2 text-ink-muted">{t("auth.pitch")}</p>
      </div>
      <LoginForm initialError={error ? t("auth.generic") : undefined} />
    </main>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2 text-primary">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path d="M19 10l-6 6 6 6" stroke="var(--on-primary)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-xl font-bold text-ink">قدّام</span>
    </div>
  );
}
