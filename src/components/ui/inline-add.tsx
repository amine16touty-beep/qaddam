"use client";
import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/utils";

/** Type + Enter to add. Stays focused for rapid entry. */
export function InlineAdd({
  placeholder,
  onAdd,
  withDate = false,
}: {
  placeholder: string;
  onAdd: (text: string, date: string | null) => Promise<ActionResult<unknown>>;
  withDate?: boolean;
}) {
  const [pending, start] = useTransition();
  const [date, setDate] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      className="flex items-center gap-2 rounded-xl px-2 py-1.5 focus-within:bg-muted/60"
      action={(f) => {
        const text = String(f.get("text") ?? "").trim();
        if (!text) return;
        start(async () => {
          const r = await onAdd(text, date || null);
          if (!r.ok) return void toast.error(r.error);
          if (ref.current && ref.current.value.trim() === text) ref.current.value = "";
          setDate("");
          ref.current?.focus();
        });
      }}
    >
      <Plus size={18} className="shrink-0 text-primary" aria-hidden />
      <input
        ref={ref}
        name="text"
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={pending}
        maxLength={300}
        autoComplete="off"
        className="h-9 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-ink-muted/70 focus:outline-none"
      />
      {withDate && (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="date"
          className="h-8 w-[8.5rem] rounded-lg border border-line bg-surface px-2 text-xs text-ink-muted"
        />
      )}
    </form>
  );
}
