"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Phone: bottom sheet with a grab handle you can drag down to dismiss.
 * Tablet/desktop: centred panel, or a full-height side panel when `side` is set
 * (used for details, so the list stays visible next to it on an iPad).
 * Built on <dialog>: focus trap, Esc to close and inert background come for free.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
  wide,
  side,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
  side?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("app");
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) setDrag(0);
  }, [open]);

  // Drag-to-dismiss, phones only (the handle is hidden from md up)
  const dragProps = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch" || window.innerWidth >= 768) return;
      startY.current = e.clientY;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (startY.current == null) return;
      setDrag(Math.max(0, e.clientY - startY.current));
    },
    onPointerUp: () => {
      if (startY.current == null) return;
      startY.current = null;
      if (drag > 110) onClose();
      else setDrag(0);
    },
  };

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
        side
          ? "md:ms-auto md:me-0 md:mt-0 md:h-dvh md:max-h-none md:w-[440px]"
          : cn("md:m-auto md:w-[calc(100%-2rem)]", wide ? "md:max-w-2xl" : "md:max-w-lg"),
      )}
    >
      {open && (
        <div
          style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
          className={cn(
            "safe-bottom max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border border-line bg-surface shadow-float transition-transform",
            side ? "animate-side md:h-full md:max-h-none md:rounded-none md:rounded-e-none md:border-y-0 md:border-e-0" : "animate-in md:rounded-2xl",
            className,
          )}
        >
          <div className="sticky top-0 z-10 bg-surface" {...dragProps}>
            <div className="flex justify-center pt-2.5 md:hidden" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-line" />
            </div>
            <div className={cn("flex items-center justify-between px-5 pt-2 pb-2 md:pt-4", side && "md:pt-[calc(env(safe-area-inset-top)+1.25rem)]")}>
              <h2 className="text-base font-semibold">{title}</h2>
              <button onClick={onClose} className="-me-2 rounded-lg p-2 text-ink-muted hover:bg-muted" aria-label={t("close")}>
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="px-5 pb-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
