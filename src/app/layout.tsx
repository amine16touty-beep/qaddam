import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "sonner";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "قدّام", template: "%s · قدّام" },
  description: "كل يوم خطوة لقدّام. مهامك وعاداتك ومشاريعك ولقاءاتك في مكان واحد.",
  applicationName: "قدّام",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "قدّام", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c10" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const theme = (await cookies()).get("qaddam_theme")?.value;
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-theme={theme === "light" || theme === "dark" ? theme : undefined}
      className={plex.variable}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          {children}
          <Toaster
            position="bottom-center"
            dir={locale === "ar" ? "rtl" : "ltr"}
            toastOptions={{
              className: "!font-sans !rounded-xl !border-line !bg-surface !text-ink !shadow-float",
            }}
            offset={88}
            mobileOffset={88}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
