import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { iconPaths } from "@/lib/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "FeedbackFlow | Turn feedback into a trusted roadmap",
  description:
    "Collect customer feedback, prioritize what matters, and share product progress with FeedbackFlow.",
};

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

const freeFeatures = ["1 public project", "50 feedback items", "Voting and roadmap"];
const proFeatures = ["Unlimited feedback", "Everything in Free", "Self-service billing portal"];

function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-[74px] max-w-content items-center justify-between px-6 md:px-10">
        <Link aria-label="FeedbackFlow home" className="rounded-control" href="/">
          <Brand />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
          <Link className="text-sm font-medium text-subtle-foreground hover:text-foreground" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium text-subtle-foreground hover:text-foreground" href="#pricing">
            Pricing
          </Link>
          <Link className="text-sm font-medium text-subtle-foreground hover:text-foreground" href="/profile">
            About the maker
          </Link>
          <Link className="text-sm font-medium text-subtle-foreground hover:text-foreground" href="/login">
            Sign in
          </Link>
          <Link className={buttonVariants({ size: "compact" })} href="/register">
            Create your board
          </Link>
        </nav>

        <details className="relative md:hidden">
          <summary
            aria-label="Open navigation"
            className="flex size-10 cursor-pointer list-none items-center justify-center rounded-control text-text hover:bg-surface-hover [&::-webkit-details-marker]:hidden"
          >
            <Image alt="" aria-hidden="true" height={24} src={iconPaths.menu} width={24} />
          </summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute top-full right-0 z-10 mt-3 flex w-56 flex-col gap-1 rounded-surface border border-border bg-background p-3 shadow-lg"
          >
            {[
              ["Features", "#features"],
              ["Pricing", "#pricing"],
              ["About the maker", "/profile"],
              ["Sign in", "/login"],
            ].map(([label, href]) => (
              <Link className="rounded-control px-4 py-3 text-sm font-medium text-text hover:bg-surface-hover" href={href} key={href}>
                {label}
              </Link>
            ))}
            <Link className={cn(buttonVariants({ size: "compact" }), "mt-1 w-full")} href="/register">
              Create your board
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function ProductPreview() {
  return (
    <aside aria-label="FeedbackFlow product preview" className="ui-card w-full max-w-xl justify-self-center overflow-hidden lg:justify-self-end">
      <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
        <div>
          <p className="text-sm font-bold text-foreground">Product momentum</p>
          <p className="mt-1 text-[11px] text-muted-foreground">128 feedback · 1.8k votes</p>
        </div>
        <span className="rounded-pill bg-surface-success px-3 py-1 text-[11px] font-bold text-success">LIVE</span>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xs font-bold tracking-wide text-muted-foreground">TRENDING FEEDBACK</p>
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
            <span className="min-w-0 truncate text-sm font-semibold">{title}</span>
            <span className="col-start-2 text-[11px] font-semibold text-primary sm:col-auto">{status}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="mx-auto grid max-w-content items-center gap-14 px-6 py-14 md:px-10 md:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-7 inline-flex rounded-pill bg-surface-brand px-4 py-1.5 text-xs font-bold tracking-wide text-primary">
              FEEDBACK SAAS
            </p>
            <h1 className="max-w-xl text-heading-lg leading-[1.125] font-bold tracking-tight text-foreground md:text-display md:leading-tight">
              Turn feedback into a roadmap customers trust.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Collect ideas, prioritize what matters, and share progress from one focused workspace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className={cn(buttonVariants({ size: "compact" }), "w-full sm:w-auto sm:min-w-48")} href="/register">
                Create your board
              </Link>
              <Link className={cn(buttonVariants({ size: "compact", variant: "secondary" }), "w-full sm:w-auto sm:min-w-48")} href="/p/demo">
                View live demo
              </Link>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section className="bg-surface px-6 py-16 md:px-10 md:py-20" id="features">
          <div className="mx-auto max-w-content">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-widest text-primary">FEATURES</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-heading-lg">
                Everything needed for the feedback loop
              </h2>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {features.map((feature, index) => (
                <article className="ui-card p-6 md:p-7" key={feature.title}>
                  <span className="flex size-10 items-center justify-center rounded-control bg-surface-brand text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="mt-6 text-[11px] font-bold tracking-widest text-primary">{feature.eyebrow}</p>
                  <h3 className="mt-2 text-lg font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20" id="pricing">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-xs font-bold tracking-widest text-primary">PRICING</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-heading-lg">Start focused, grow when you need to</h2>
              <p className="mt-3 text-sm text-muted-foreground">Try Pro with Paddle sandbox payments. No real money is charged.</p>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-2">
              <PricingCard description="For one focused public feedback board." features={freeFeatures} price="$0" title="Free" />
              <PricingCard description="For growing feedback programs. Preview only." features={proFeatures} price="$19" title="Pro" />
            </div>
          </div>
        </section>

        <section className="bg-foreground px-6 py-14 text-center text-background md:px-10 md:py-16">
          <h2 className="text-2xl font-bold md:text-heading-lg">Make product progress visible</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-border">Open a board, collect the signal, and let your roadmap tell the story.</p>
          <Link className={cn(buttonVariants(), "mt-7 border-background bg-background text-foreground hover:border-surface-hover hover:bg-surface-hover")} href="/register">
            Create your board
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-content flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-10">
          <Brand />
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="hover:text-foreground" href="/p/demo">Live demo</Link>
            <Link className="hover:text-foreground" href="/p/demo/roadmap">Roadmap</Link>
            <Link className="hover:text-foreground" href="/profile">About the maker</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({
  description,
  features,
  price,
  title,
}: {
  description: string;
  features: readonly string[];
  price: string;
  title: string;
}) {
  return (
    <article className={cn("ui-card p-6 md:p-8", title === "Pro" && "border-primary")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {title === "Pro" ? <span className="rounded-pill bg-surface-brand px-3 py-1 text-[11px] font-bold text-primary">PREVIEW</span> : null}
      </div>
      <p className="mt-7 text-4xl font-bold">{price}<span className="text-sm font-normal text-muted-foreground"> / month</span></p>
      <ul className="mt-7 space-y-3 text-sm text-text">
        {features.map((feature) => <li key={feature}>✓ {feature}</li>)}
      </ul>
      <Link className={cn(buttonVariants({ variant: title === "Free" ? "primary" : "secondary" }), "mt-8 w-full")} href={title === "Free" ? "/register" : "/login?returnTo=/dashboard/billing"}>
        {title === "Free" ? "Start free" : "Try Pro in sandbox"}
      </Link>
    </article>
  );
}
