"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from ".";
import { Sheet } from "./sheet";

/** Explicit confirmation only for destructive, hard-to-undo actions. */
export function useConfirm() {
  const t = useTranslations("app");
  const [state, setState] = useState<{ title: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = (title: string) => new Promise<boolean>((resolve) => setState({ title, resolve }));
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const dialog = (
    <Sheet open={!!state} onClose={() => close(false)} title={state?.title ?? ""}>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={() => close(false)}>{t("cancel")}</Button>
        <Button variant="danger" onClick={() => close(true)} autoFocus>{t("delete")}</Button>
      </div>
    </Sheet>
  );
  return { confirm, dialog };
}
