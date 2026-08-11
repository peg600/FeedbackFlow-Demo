import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in | FeedbackFlow",
  description: "Sign in to manage your FeedbackFlow workspace.",
};

const metrics = [
  { value: "128", label: "feedback items" },
  { value: "1.8k", label: "community votes" },
  { value: "3", label: "roadmap stages" },
] as const;

function ProductProof() {
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
          {metrics.map((metric) => (
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

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col bg-background md:block md:bg-surface lg:flex lg:flex-row">
      <ProductProof />

      <section className="flex w-full min-w-0 flex-1 justify-center px-5 pt-6 pb-10 md:min-h-svh md:items-start md:px-0 md:py-20 lg:w-auto lg:items-center lg:p-10 xl:items-start xl:py-14">
        <div className="w-full min-w-0 md:w-[520px] md:rounded-surface md:border md:border-border md:bg-background md:p-12 md:shadow-[0_8px_12px_rgb(16_24_40/3%)] lg:w-[430px] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
