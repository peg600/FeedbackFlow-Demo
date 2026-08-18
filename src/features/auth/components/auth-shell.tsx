import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";

const loginMetrics = [
  { value: "128", label: "feedback items" },
  { value: "1.8k", label: "community votes" },
  { value: "3", label: "roadmap stages" },
] as const;

const registerBenefits = [
  "A public feedback board",
  "Owner-only project controls",
  "A roadmap generated from status",
  "Stripe test-mode upgrade flow",
] as const;

function LoginProductProof() {
  return (
    <aside className="hidden min-h-svh w-[350px] shrink-0 flex-col bg-text px-10 py-14 lg:flex xl:w-[480px] xl:px-16">
      <Brand inverse />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-center xl:flex-[2_1_0%]">
          <div className="flex w-full flex-col items-start gap-6">
            <span className="rounded-pill bg-surface-brand px-4 py-1.5 text-[11px] leading-[17px] font-bold tracking-[0.5px] text-primary">
              LIVE PRODUCT DEMO
            </span>
            <h2 className="w-full text-[32px] leading-10 font-bold text-white xl:text-[43px] xl:leading-12">
              See the full owner workflow in minutes.
            </h2>
            <p className="w-full text-[15px] leading-[1.6] text-border-strong xl:text-body xl:leading-[26px]">
              Use the demo workspace to manage feedback, publish roadmap
              updates, and inspect test billing.
            </p>
          </div>
        </div>

        <dl className="flex w-full shrink-0 flex-col gap-5 xl:min-h-0 xl:flex-1 xl:flex-row xl:items-start xl:justify-between xl:gap-0">
          {loginMetrics.map((metric) => (
            <div className="flex min-w-0 flex-col gap-1" key={metric.label}>
              <dt className="order-2 text-[11px] leading-4 text-border-strong">
                {metric.label}
              </dt>
              <dd className="text-heading-md leading-[34px] font-bold text-white xl:text-[27px] xl:leading-[39px]">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}

function RegisterProductProof() {
  return (
    <aside className="hidden min-h-svh w-[350px] shrink-0 flex-col justify-between bg-auth-proof px-10 py-14 lg:flex xl:w-[480px] xl:justify-start xl:px-16">
      <Brand inverse />

      <div className="flex w-full flex-col gap-12 xl:mt-[130px] xl:gap-[90px]">
        <p className="text-[32px] leading-[38px] font-bold text-white xl:text-[43px] xl:leading-12">
          Start with one project. Ship the whole loop.
        </p>

        <ul className="flex flex-col gap-5 xl:gap-[34px]">
          {registerBenefits.map((benefit) => (
            <li
              className="flex min-w-0 items-center gap-3 text-body-sm font-semibold text-white"
              key={benefit}
            >
              <span
                aria-hidden="true"
                className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-success text-xs font-bold text-white xl:size-6"
              >
                ✓
              </span>
              <span className="min-w-0">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-auth-proof-muted xl:mt-[110px]">
        Free plan includes up to 50 feedback items.
      </p>
    </aside>
  );
}

type AuthShellProps = {
  children: ReactNode;
  proof: "login" | "register";
};

export function AuthShell({ children, proof }: AuthShellProps) {
  return (
    <main className="flex min-h-svh flex-col bg-background md:block md:bg-surface lg:flex lg:flex-row">
      {proof === "register" ? (
        <RegisterProductProof />
      ) : (
        <LoginProductProof />
      )}

      <section
        className={cn(
          "flex w-full min-w-0 flex-1 justify-center px-5 pt-6 pb-10 md:min-h-svh md:items-start md:px-0 md:py-20 lg:w-auto lg:items-center lg:p-10 xl:items-start",
          proof === "register" ? "xl:pt-[62px] xl:pb-14" : "xl:py-14",
        )}
      >
        <div className="w-full min-w-0 md:w-[520px] md:rounded-surface md:border md:border-border md:bg-background md:p-12 md:shadow-[0_8px_12px_rgb(16_24_40/3%)] lg:w-[430px] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {children}
        </div>
      </section>
    </main>
  );
}
