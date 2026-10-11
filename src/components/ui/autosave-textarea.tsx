"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/utils";

/**
 * Saves 800 ms after typing stops (and on blur). Until the server confirms,
 * the text is mirrored to localStorage so a dropped connection loses nothing.
 */
export function AutosaveTextarea({
  draftKey,
  value,
  onSave,
  className,
  ...props
}: {
  draftKey: string;
  value: string;
  onSave: (v: string) => Promise<ActionResult<unknown>>;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "defaultValue">) {
  const t = useTranslations("app");
  const [text, setText] = useState(value);
  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const saved = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const key = `qaddam:draft:${draftKey}`;

  useEffect(() => {
    try {
      const d = localStorage.getItem(key);
      if (d !== null && d !== value) {
        setText(d);
        setState("dirty");
        schedule(d, 50);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function schedule(v: string, ms = 800) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(v), ms);
  }

  async function flush(v: string) {
    clearTimeout(timer.current);
    if (v === saved.current) return;
    setState("saving");
    const r = await onSave(v);
    if (r.ok) {
      saved.current = v;
      setState("saved");
      try { localStorage.removeItem(key); } catch {}
    } else {
      setState("error");
    }
  }

  return (
    <div className="relative">
      <textarea
        {...props}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setState("dirty");
          try { localStorage.setItem(key, e.target.value); } catch {}
          schedule(e.target.value);
        }}
        onBlur={() => flush(text)}
        className={cn(
          "w-full resize-y rounded-[var(--radius-control)] border border-transparent bg-transparent px-3 py-2 text-[15px] leading-7 placeholder:text-ink-muted/60 hover:border-line focus:border-primary focus:bg-surface focus:outline-none",
          className,
        )}
      />
      <span className="pointer-events-none absolute bottom-2 end-3 text-[11px] text-ink-muted" aria-live="polite">
        {state === "saving" ? t("saving") : state === "saved" ? `${t("saved")} ✓` : state === "error" ? (
          <button type="button" className="pointer-events-auto text-danger underline" onClick={() => flush(text)}>{t("saveFailed")} · {t("retry")}</button>
        ) : ""}
      </span>
    </div>
  );
}
