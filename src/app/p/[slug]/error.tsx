"use client";

import { useI18n } from "@/lib/i18n/client";
import { BasicHeader } from "@/components/basic-header";

import { Button } from "@/components/ui/button";

export default function PublicFeedbackError({ reset }: { reset: () => void }) {
  const { t, locale } = useI18n();
  return (
    <div className="min-h-svh bg-surface"><BasicHeader locale={locale} />
    <main className="flex min-h-[60svh] items-center justify-center p-5">
      <section className="ui-card w-full max-w-md rounded-surface p-8 text-center">
        <h1 className="text-heading-md font-bold text-foreground">{t("Public feedback is temporarily unavailable")}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("Try loading this board again.")}</p>
        <Button className="mt-6" onClick={reset}>{t("Try again")}</Button>
      </section>
    </main></div>
  );
}
