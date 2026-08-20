import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { OnboardingForm } from "@/features/projects/components/onboarding-form";
import { getCurrentProjectAccess } from "@/server/services/project-access";

export default async function OnboardingPage() {
  const { project, session } = await getCurrentProjectAccess();

  if (!session) {
    redirect("/login?returnTo=/onboarding");
  }

  if (project) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-svh bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-20 max-w-content items-center justify-between px-5 md:px-8 xl:px-[72px]">
          <Brand />
          <p className="text-xs font-semibold text-success">Account created</p>
        </div>
      </header>

      <main className="mx-auto flex max-w-content flex-col px-5 pb-16 pt-9 md:px-8 xl:px-[72px]">
        <section aria-label="Onboarding progress">
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full w-[57%] rounded-full bg-primary" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-primary">Workspace</span>
            <span className="text-muted-foreground">Dashboard</span>
          </div>
        </section>

        <section className="mt-10 flex flex-col items-center md:mt-11">
          <header className="text-center">
            <h1
              className="text-[28px] leading-9 font-bold text-foreground md:text-heading-lg md:leading-[44px]"
              id="onboarding-title"
            >
              Create your product workspace
            </h1>
            <p className="mt-2 text-body-sm text-muted-foreground">
              This becomes the owner dashboard and the public feedback URL.
            </p>
          </header>

          <div className="mt-9 flex w-full justify-center md:mt-10">
            <OnboardingForm />
          </div>
        </section>
      </main>
    </div>
  );
}
