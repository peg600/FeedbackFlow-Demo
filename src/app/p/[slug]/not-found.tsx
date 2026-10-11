import { getI18n } from "@/lib/i18n/server";
import { BasicHeader } from "@/components/basic-header";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default async function PublicProjectNotFound() {
  const { t, locale } = await getI18n();
  return (
    <div className="min-h-svh bg-surface"><BasicHeader locale={locale} />
    <main className="flex min-h-[60svh] items-center justify-center p-5">
      <section className="ui-card w-full max-w-md rounded-surface p-8 text-center">
        <p className="text-[11px] font-bold tracking-wide text-primary uppercase">{t("Public board unavailable")}</p>
        <h1 className="mt-3 text-heading-md font-bold text-foreground">{t("This project could not be found.")}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("The link may be incorrect, private, or no longer available.")}</p>
        <Link className={`${buttonVariants()} mt-6`} href="/">{t("Go to FeedbackFlow")}</Link>
      </section>
    </main></div>
  );
}
