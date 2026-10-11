"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, FolderKanban, House, LogOut, Plus, Search, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, syncTimezone } from "@/app/actions/settings";
import { ShellCtx, type CapturePreset, type ShellData } from "./shell-context";
import { QuickCapture } from "./quick-capture";
import { CommandPalette } from "./command-palette";
import { ContextFilter } from "./context-filter";

const NAV = [
  { href: "/today", key: "today", icon: House },
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "#capture", key: "capture", icon: Plus },
  { href: "/calendar", key: "calendar", icon: CalendarDays },
  { href: "/progress", key: "progress", icon: TrendingUp },
] as const;

const SECTION_PREFIX: Record<string, string[]> = {
  "/today": ["/today", "/tasks", "/notes"],
  "/projects": ["/projects", "/programs"],
  "/calendar": ["/calendar", "/meetings"],
  "/progress": ["/progress", "/habits"],
};

export function AppShell({ data, children }: { data: ShellData; children: React.ReactNode }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [capture, setCapture] = useState<CapturePreset | null>(null);
  const [search, setSearch] = useState(false);

  const openCapture = useCallback((p?: CapturePreset) => setCapture(p ?? {}), []);
  const openSearch = useCallback(() => setSearch(true), []);

  // keyboard shortcuts: N task · M meeting · / or Ctrl+K search · G then T/P/C/R navigate
  useEffect(() => {
    let g = false;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
      const k = e.key.toLowerCase();
      if (g) {
        g = false;
        const to = { t: "/today", p: "/projects", c: "/calendar", r: "/progress" }[k];
        if (to) router.push(to);
        return;
      }
      if (k === "g") g = true;
      else if (k === "n") { e.preventDefault(); setCapture({ type: "task" }); }
      else if (k === "m") { e.preventDefault(); setCapture({ type: "meeting" }); }
      else if (k === "/") { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // align timezone with the device the first time
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (data.tz === "UTC" && tz && tz !== "UTC") syncTimezone(tz);
  }, [data.tz, router]);

  const active = (href: string) => (SECTION_PREFIX[href] ?? [href]).some((p) => pathname.startsWith(p));

  return (
    <ShellCtx.Provider value={{ data, openCapture, openSearch }}>
      <div className="lg:flex">
        {/* Desktop sidebar (right side in RTL) */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e border-line bg-surface px-3 py-5 lg:flex">
          <Link href="/today" className="mb-6 flex items-center gap-2 px-3">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="text-primary">
              <rect width="32" height="32" rx="9" fill="currentColor" />
              <path d="M19 10l-6 6 6 6" stroke="var(--on-primary)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-bold">قدّام</span>
          </Link>
          <button
            onClick={() => setSearch(true)}
            className="mb-3 flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-bg px-3 text-sm text-ink-muted hover:border-primary/40"
          >
            <Search size={16} /> {t("search")}
            <kbd className="ms-auto rounded border border-line px-1.5 text-[11px]" dir="ltr">Ctrl K</kbd>
          </button>
          <nav aria-label={t("main")} className="flex flex-col gap-1">
            {NAV.map(({ href, key, icon: Icon }) =>
              key === "capture" ? (
                <button
                  key={key}
                  onClick={() => setCapture({})}
                  className="my-1 flex h-10 items-center gap-3 rounded-[var(--radius-control)] bg-primary px-3 text-sm font-medium text-on-primary hover:bg-primary-hover"
                >
                  <Icon size={18} /> {t(key)}
                  <kbd className="ms-auto rounded bg-white/15 px-1.5 text-[11px]">N</kbd>
                </button>
              ) : (
                <Link
                  key={key}
                  href={href}
                  aria-current={active(href) ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm transition-colors",
                    active(href) ? "bg-primary-soft font-medium text-primary" : "text-ink-muted hover:bg-muted hover:text-ink",
                  )}
                >
                  <Icon size={18} /> {t(key)}
                </Link>
              ),
            )}
          </nav>
          <div className="mt-auto flex flex-col gap-1">
            <Link
              href="/settings"
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm",
                pathname.startsWith("/settings") ? "bg-primary-soft text-primary" : "text-ink-muted hover:bg-muted hover:text-ink",
              )}
            >
              <Settings size={18} /> {t("settings")}
            </Link>
            <form action={signOut}>
              <button className="flex h-10 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm text-ink-muted hover:bg-muted hover:text-ink">
                <LogOut size={18} className="flip-rtl" /> {t("signOut")}
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 lg:px-8">
              <Link href="/today" className="flex items-center gap-2 lg:hidden" aria-label="قدّام">
                <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden className="text-primary">
                  <rect width="32" height="32" rx="9" fill="currentColor" />
                  <path d="M19 10l-6 6 6 6" stroke="var(--on-primary)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <ContextFilter />
              <div className="ms-auto flex items-center gap-1 lg:hidden">
                <button onClick={() => setSearch(true)} className="rounded-lg p-2.5 text-ink-muted hover:bg-muted" aria-label={t("search")}>
                  <Search size={20} />
                </button>
                <Link href="/settings" className="rounded-lg p-2.5 text-ink-muted hover:bg-muted" aria-label={t("settings")}>
                  <Settings size={20} />
                </Link>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label={t("main")}
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {NAV.map(({ href, key, icon: Icon }) => (
            <li key={key} className="flex justify-center">
              {key === "capture" ? (
                <button
                  onClick={() => setCapture({})}
                  aria-label={t("capture")}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-float active:scale-95"
                >
                  <Plus size={24} />
                </button>
              ) : (
                <Link
                  href={href}
                  aria-current={active(href) ? "page" : undefined}
                  className={cn(
                    "flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px]",
                    active(href) ? "font-medium text-primary" : "text-ink-muted",
                  )}
                >
                  <Icon size={22} strokeWidth={active(href) ? 2.2 : 1.75} />
                  {t(key)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <QuickCapture preset={capture} onClose={() => setCapture(null)} />
      <CommandPalette open={search} onClose={() => setSearch(false)} />
    </ShellCtx.Provider>
  );
}
