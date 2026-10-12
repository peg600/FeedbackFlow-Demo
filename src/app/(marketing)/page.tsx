import { HomeHeader } from "@/features/auth/components/home-header";
import { HomeActionLink } from "@/features/auth/components/home-action-link";
import type { Translator } from "@/lib/i18n/shared";
import { getI18n } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { FREE_FEEDBACK_LIMIT } from "@/features/billing/limits";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
  title: t("FeedbackFlow | Turn feedback into a trusted roadmap"),
  description:
    t("Collect customer feedback, prioritize what matters, and share product progress with FeedbackFlow."),
};
}

const features = [
  {
    eyebrow: "COLLECT",
    title: "One place for customer ideas",
    description:
      "Public boards, search, and structured submissions keep feedback focused and easy to discover.",
  },
  {
    eyebrow: "PRIORITIZE",
    title: "Let demand guide the work",
    description:
      "Votes, status workflows, and owner controls make the next decision visible to your team.",
  },
  {
    eyebrow: "SHARE PROGRESS",
    title: "Publish a roadmap automatically",
    description:
      "Planned, in-progress, and completed work flows straight from feedback states into a trusted roadmap.",
  },
] as const;

const freeFeatures = ["1 public project", "{count} feedback items", "Voting and roadmap"];
const proFeatures = ["Unlimited feedback", "Everything in Free", "Self-service billing portal"];

function ProductPreview({ t }: { t: Translator }) {
  return (
    <aside aria-label={t("FeedbackFlow product preview")} className="ui-card w-full max-w-xl justify-self-center overflow-hidden lg:justify-self-end">
      <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
        <div>
          <p className="text-sm font-bold text-foreground">{t("Product momentum")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("128 feedback · 1.8k votes")}</p>
        </div>
        <span className="rounded-pill bg-surface-success px-3 py-1 text-[11px] font-bold text-success">{t("MOCK DATA")}</span>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xs font-bold tracking-wide text-muted-foreground">{t("TRENDING FEEDBACK")}</p>
        {[
          ["Add keyboard shortcuts", "184", "In progress"],
          ["Dark mode for the dashboard", "142", "Planned"],
          ["Export feedback to CSV", "96", "Completed"],
        ].map(([title, votes, status]) => (
          <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-control border border-border-card bg-background p-3 sm:grid-cols-[44px_minmax(0,1fr)_auto]" key={title}>
            <span className="flex h-11 flex-col items-center justify-center rounded-placeholder bg-surface text-xs font-bold">
              <span aria-hidden="true" className="text-[9px] text-primary">▲</span>
              {votes}
            </span>
            <span className="min-w-0 truncate text-sm font-semibold">{t(title)}</span>
            <span className="col-start-2 text-[11px] font-semibold text-primary sm:col-auto">{t(status)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default async function HomePage() {
  const { t } = await getI18n();
  return (
    <div className="min-h-screen bg-background">
      <HomeHeader />
      <main>
        <section className="mx-auto grid max-w-content items-center gap-14 px-6 py-14 md:px-10 md:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-7 inline-flex rounded-pill bg-surface-brand px-4 py-1.5 text-xs font-bold tracking-wide text-primary">{t("FEEDBACK SAAS")}</p>
            <h1 className="max-w-xl text-heading-lg leading-[1.125] font-bold tracking-tight text-foreground md:text-display md:leading-tight">{t("Turn feedback into a roadmap customers trust.")}</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">{t("Collect ideas, prioritize what matters, and share progress from one focused workspace.")}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <HomeActionLink className={cn(buttonVariants({ size: "compact" }), "w-full sm:w-auto sm:min-w-48")} intent="board" />
              <Link className={cn(buttonVariants({ size: "compact", variant: "secondary" }), "w-full sm:w-auto sm:min-w-48")} href="/p/demo">{t("View live demo")}</Link>
            </div>
          </div>
          <ProductPreview t={t} />
        </section>

        <section className="bg-surface px-6 py-16 md:px-10 md:py-20" id="features">
          <div className="mx-auto max-w-content">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-widest text-primary">{t("FEATURES")}</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-heading-lg">{t("Everything needed for the feedback loop")}</h2>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {features.map((feature, index) => (
                <article className="ui-card p-6 md:p-7" key={feature.title}>
                  <span className="flex size-10 items-center justify-center rounded-control bg-surface-brand text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="mt-6 text-[11px] font-bold tracking-widest text-primary">{t(feature.eyebrow)}</p>
                  <h3 className="mt-2 text-lg font-bold">{t(feature.title)}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(feature.description)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20" id="pricing">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-xs font-bold tracking-widest text-primary">{t("PRICING")}</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-heading-lg">{t("Start focused, grow when you need to")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("Try Pro with Paddle sandbox payments. No real money is charged.")}</p>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-2">
              <PricingCard t={t} description="For one focused public feedback board." features={freeFeatures} price="$0" title="Free" />
              <PricingCard t={t} description="For growing feedback programs. Preview only." features={proFeatures} price="$19" title="Pro" />
            </div>
          </div>
        </section>

        <section className="bg-foreground px-6 py-14 text-center text-background md:px-10 md:py-16">
          <h2 className="text-2xl font-bold md:text-heading-lg">{t("Make product progress visible")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-border">{t("Open a board, collect the signal, and let your roadmap tell the story.")}</p>
          <HomeActionLink className={cn(buttonVariants(), "mt-7 border-background bg-background text-foreground hover:border-surface-hover hover:bg-surface-hover")} intent="board" />
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-content flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-10">
          <Brand />
          <nav aria-label={t("Footer navigation")} className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="hover:text-foreground" href="/p/demo">{t("Live demo")}</Link>
            <Link className="hover:text-foreground" href="/p/demo/roadmap">{t("Roadmap")}</Link>
            <Link className="hover:text-foreground" href="/profile">{t("About the maker")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({
  t,
  description,
  features,
  price,
  title,
}: {
  t: Translator;
  description: string;
  features: readonly string[];
  price: string;
  title: string;
}) {
  return (
    <article className={cn("ui-card p-6 md:p-8", title === "Pro" && "border-primary")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">{t(title)}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t(description)}</p>
        </div>
        {title === "Pro" ? <span className="rounded-pill bg-surface-brand px-3 py-1 text-[11px] font-bold text-primary">{t("PREVIEW")}</span> : null}
      </div>
      <p className="mt-7 text-4xl font-bold">{price}<span className="text-sm font-normal text-muted-foreground">{t("/ month")}</span></p>
      <ul className="mt-7 space-y-3 text-sm text-text">
        {features.map((feature) => <li key={feature}>✓ {t(feature, { count: FREE_FEEDBACK_LIMIT })}</li>)}
      </ul>
      <HomeActionLink className={cn(buttonVariants({ variant: title === "Free" ? "primary" : "secondary" }), "mt-8 w-full")} intent={title === "Free" ? "free" : "pro"} />
    </article>
  );
}
