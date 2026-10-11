"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckSquare, FolderKanban, Gavel, NotebookPen, Search, Users } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { searchAll } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

type Hit = Awaited<ReturnType<typeof searchAll>>[number];

const ICON = { project: FolderKanban, task: CheckSquare, meeting: Users, decision: Gavel, note: NotebookPen } as const;
const ORDER = ["project", "task", "meeting", "decision", "note"] as const;

function hrefFor(h: Hit) {
  switch (h.kind) {
    case "project": return `/projects/${h.id}`;
    case "task": return `/tasks?open=${h.id}`;
    case "meeting": return `/meetings/${h.id}`;
    case "decision": return `/meetings/${h.subtitle}#d-${h.id}`;
    default: return `/notes?open=${h.id}`;
  }
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("search");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState(0);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setHits([]);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) return setHits([]);
    const id = setTimeout(() => start(async () => {
      setHits(await searchAll(q));
      setSel(0);
    }), 180);
    return () => clearTimeout(id);
  }, [q]);

  const sorted = ORDER.flatMap((k) => hits.filter((h) => h.kind === k));
  const go = (h: Hit) => {
    onClose();
    router.push(hrefFor(h));
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("placeholder").replace("…", "")}>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-3 start-3 text-ink-muted" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, sorted.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === "Enter" && sorted[sel]) go(sorted[sel]);
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          role="combobox"
          aria-expanded={sorted.length > 0}
          aria-controls="search-results"
          className="h-12 w-full rounded-xl border border-line bg-bg ps-10 pe-3 text-base focus:border-primary focus:outline-none"
        />
      </div>
      <div id="search-results" role="listbox" className={cn("mt-3 min-h-24", pending && "opacity-60")}>
        {!q.trim() ? (
          <p className="py-6 text-center text-sm text-ink-muted">{t("recent")}</p>
        ) : sorted.length === 0 && !pending ? (
          <p className="py-6 text-center text-sm text-ink-muted">{t("empty", { q })}</p>
        ) : (
          ORDER.map((k) => {
            const group = sorted.filter((h) => h.kind === k);
            if (!group.length) return null;
            const Icon = ICON[k];
            return (
              <div key={k} className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-ink-muted">{t(k)}</p>
                {group.map((h) => {
                  const i = sorted.indexOf(h);
                  return (
                    <button
                      key={h.kind + h.id}
                      role="option"
                      aria-selected={i === sel}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => go(h)}
                      className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-start text-sm", i === sel && "bg-primary-soft")}
                    >
                      <Icon size={16} className="shrink-0 text-ink-muted" />
                      <span className="truncate">{h.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </Sheet>
  );
}
