import type { Metadata } from "next";
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
  return { title: "FeedbackFlow", description: t("Collect customer feedback, prioritize what matters, and share product progress.") };
}

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
