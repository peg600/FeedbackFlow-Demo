import type { Metadata, Viewport } from "next";
import { getSiteUrl, isIndexableEnvironment, NO_INDEX } from "@/lib/seo";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(getSiteUrl()),
    title: "FeedbackFlow",
    description: t("Collect customer feedback, prioritize what matters, and share product progress."),
    applicationName: "FeedbackFlow",
    creator: "Nanxuan Li",
    referrer: "strict-origin-when-cross-origin",
    icons: { icon: [{ url: "/icons/logo-mark.svg", type: "image/svg+xml" }] },
    robots: isIndexableEnvironment() ? { index: true, follow: true } : NO_INDEX,
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = { themeColor: "#675dff", colorScheme: "light" };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getI18n();
  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><I18nProvider locale={locale}>{children}</I18nProvider></body>
    </html>
  );
}
