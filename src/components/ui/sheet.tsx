"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet on phones, centred panel on larger screens.
 * Built on <dialog>: focus trap, Esc to close and inert background come for free.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("app");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none overflow-visible bg-transparent p-0 text-ink backdrop:backdrop-blur-[1px]",
        "sm:m-auto sm:w-[calc(100%-2rem)]",
        wide ? "sm:max-w-2xl" : "sm:max-w-lg",
      )}
    >
      {open && (
        <div
          className={cn(
            "animate-in safe-bottom max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface shadow-float sm:rounded-2xl",
            className,
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-5 pt-4 pb-2">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} className="-me-2 rounded-lg p-2 text-ink-muted hover:bg-muted" aria-label={t("close")}>
              <X size={18} />
            </button>
          </div>
          <div className="px-5 pb-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
