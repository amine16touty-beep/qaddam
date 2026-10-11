import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionTabs({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="mb-5 inline-flex rounded-xl bg-muted p-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={active === i.key ? "page" : undefined}
          className={cn("rounded-lg px-4 py-1.5 text-sm", active === i.key ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink")}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
