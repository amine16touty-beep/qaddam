"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown, Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTaskPriority } from "@/app/actions/tasks";
import { useShell, type CaptureType } from "@/components/shell/shell-context";

export function AddTaskButton({ label, type = "task" }: { label: string; type?: CaptureType }) {
  const { openCapture, data } = useShell();
  return (
    <button
      type="button"
      onClick={() => openCapture({ type, due_date: data.today })}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-primary hover:bg-primary-soft"
    >
      <Plus size={16} /> {label}
    </button>
  );
}

export function Collapsible({ label, children, tone, defaultOpen = false }: { label: string; children: React.ReactNode; tone?: "danger"; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium", tone === "danger" ? "text-danger" : "text-ink-muted")}
      >
        <ChevronDown size={16} className={cn("transition-transform", !open && "rotate-90 rtl:-rotate-90")} />
        {label}
      </button>
      {open && <div className="animate-in">{children}</div>}
    </div>
  );
}

export function SuggestPriority({ id, title }: { id: string; title: string }) {
  const { data } = useShell();
  const t = useTranslations("task");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setTaskPriority(id, data.today);
          if (!r.ok) toast.error(r.error);
        })
      }
      className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-start text-sm text-ink-muted hover:bg-muted hover:text-ink"
      aria-label={`${t("markPriority")}: ${title}`}
    >
      <Star size={15} className="shrink-0" /> <span className="truncate">{title}</span>
    </button>
  );
}
