import Link from "next/link";

import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { createTranslator, type Locale } from "@/lib/i18n/shared";

export function BasicHeader({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex min-h-18 max-w-content flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
        <Link aria-label={t("FeedbackFlow home")} href="/"><Brand /></Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
