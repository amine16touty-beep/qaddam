import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

// Arabic is the only shipped language for now; the cookie switch is ready for English.
export default getRequestConfig(async () => {
  const c = (await cookies()).get("qaddam_locale")?.value;
  const locale: Locale = c === "en" ? "en" : "ar";
  const messages = (await import(`../../messages/ar.json`)).default;
  return { locale, messages, timeZone: "UTC" };
});
