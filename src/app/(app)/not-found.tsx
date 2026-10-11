import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { buttonClass, Card } from "@/components/ui";

export default async function NotFound() {
  const t = await getTranslations("app");
  return (
    <Card className="mx-auto mt-10 max-w-md p-6 text-center">
      <SearchX className="mx-auto mb-3 text-ink-muted" size={32} />
      <h1 className="text-lg font-semibold">{t("notFound")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("notFoundBody")}</p>
      <Link href="/today" className={buttonClass("primary", "md", "mt-5")}>{t("goHome")}</Link>
    </Card>
  );
}
