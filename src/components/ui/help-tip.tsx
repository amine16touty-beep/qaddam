"use client";
import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";

/** A small (?) that explains how a number is computed. Click or focus to read. */
export function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const t = useTranslations("progress");
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={t("howCalculated")}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="rounded-full p-0.5 text-ink-muted hover:text-primary"
      >
        <CircleHelp size={15} />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="animate-in absolute top-7 z-30 w-64 rounded-xl border border-line bg-surface p-3 text-xs leading-6 font-normal text-ink shadow-float start-0"
        >
          {text}
        </span>
      )}
    </span>
  );
}
