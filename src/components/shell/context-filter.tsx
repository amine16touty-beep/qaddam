"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setContextFilter } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

/** Global context filter: one tap to focus on one side of life. */
export function ContextFilter() {
  const { data } = useShell();
  const t = useTranslations("nav");
  const [pending, start] = useTransition();
  const current = data.contextFilter;

  const pick = (id: string | null) =>
    start(async () => {
      await setContextFilter(id);
    });

  const chips = [{ id: null as string | null, name: t("allContexts"), color: null as string | null }, ...data.contexts];
  return (
    <div
      className={cn("-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none]", pending && "opacity-60")}
      role="radiogroup"
      aria-label={t("allContexts")}
    >
      {chips.map((c) => {
        const on = current === c.id || (!current && c.id === null);
        return (
          <button
            key={c.id ?? "all"}
            role="radio"
            aria-checked={on}
            onClick={() => pick(c.id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
              on ? "border-primary/30 bg-primary-soft font-medium text-primary" : "border-transparent text-ink-muted hover:bg-muted",
            )}
          >
            {c.color && <span className="h-2 w-2 rounded-full" style={{ background: `var(--ctx-${c.color})` }} aria-hidden />}
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
