import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = { robots: NO_INDEX };
import { getI18n } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/features/projects/components/onboarding-form";
import { getCurrentProjectAccess } from "@/features/projects/server/access";

// 根据会话和现有项目决定进入登录、控制台或首次项目创建流程。
export default async function OnboardingPage() {
  const { t, locale } = await getI18n();
  const { project, session } = await getCurrentProjectAccess();

  if (!session) {
    redirect("/login?returnTo=/onboarding");
  }

  if (project) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-svh bg-surface">
      <SiteHeader locale={locale} action={<p className="text-xs font-semibold text-success">{t("Account created")}</p>} />

      <main className="mx-auto flex max-w-content flex-col px-5 pb-16 pt-9 md:px-8 xl:px-[72px]">
        <section aria-label={t("Onboarding progress")}>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full w-[57%] rounded-full bg-primary" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-primary">{t("Workspace")}</span>
            <span className="text-muted-foreground">{t("Dashboard")}</span>
          </div>
        </section>

        <section className="mt-10 flex flex-col items-center md:mt-11">
          <header className="text-center">
            <h1
              className="text-[28px] leading-9 font-bold text-foreground md:text-heading-lg md:leading-[44px]"
              id="onboarding-title"
            >{t("Create your product workspace")}</h1>
            <p className="mt-2 text-body-sm text-muted-foreground">{t("This becomes the owner dashboard and the public feedback URL.")}</p>
          </header>

          <div className="mt-9 flex w-full justify-center md:mt-10">
            <OnboardingForm />
          </div>
        </section>
      </main>
    </div>
  );
}
