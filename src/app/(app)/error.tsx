"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("app");
  useEffect(() => console.error(error), [error]);
  return (
    <Card className="mx-auto mt-10 max-w-md p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 text-warning" size={32} />
      <h1 className="text-lg font-semibold">{t("errorTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("errorBody")}</p>
      <Button className="mt-5" onClick={reset}>{t("retry")}</Button>
    </Card>
  );
}
