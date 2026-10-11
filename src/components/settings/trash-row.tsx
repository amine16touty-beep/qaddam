"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useConfirm } from "@/components/ui/confirm";
import { purgeItem, restoreItem } from "@/app/actions/settings";

type Item = { table: "tasks"; id: string; title: string; label: string; when: string };

export function TrashRow({ item }: { item: { table: string; id: string; title: string; label: string; when: string } }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();
  const it = item as Item;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl px-2 py-2.5 hover:bg-muted/60">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px]">{it.title}</p>
        <p className="text-xs text-ink-muted">{it.label} · {it.when}</p>
      </div>
      <Button size="sm" variant="soft" disabled={pending} onClick={() => start(async () => { const r = await restoreItem(it.table, it.id); if (!r.ok) toast.error(r.error); else toast.success(t("app.restored")); })}>
        {t("settings.restore")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={async () => {
          if (!(await confirm(t("settings.deleteForeverConfirm")))) return;
          start(async () => { const r = await purgeItem(it.table, it.id); if (!r.ok) toast.error(r.error); });
        }}
      >
        {t("settings.deleteForever")}
      </Button>
      {dialog}
    </div>
  );
}
