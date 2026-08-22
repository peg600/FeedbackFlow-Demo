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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-[74px] max-w-content items-center justify-between px-6 md:px-10">
          <Link
            aria-label="FeedbackFlow home"
            className="rounded-control"
            href="/"
          >
            <Brand />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 md:flex"
          >
            <Link
              className="text-sm font-medium text-subtle-foreground transition-colors duration-200 hover:text-foreground hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-8"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className={buttonVariants({ size: "compact" })}
              href="/register"
            >
              Create your board
            </Link>
          </nav>

          <details className="relative md:hidden">
            <summary
              aria-label="Open navigation"
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-control text-text transition-colors hover:bg-surface-hover [&::-webkit-details-marker]:hidden"
            >
              <Image
                alt=""
                aria-hidden="true"
                height={24}
                src={iconPaths.menu}
                width={24}
              />
            </summary>
            <nav
              aria-label="Mobile navigation"
              className="absolute top-full right-0 z-10 mt-3 flex w-52 flex-col gap-2 rounded-surface border border-border bg-background p-3 shadow-lg"
            >
              <Link
                className="rounded-control px-4 py-3 text-sm font-medium text-text hover:bg-surface-hover"
                href="/login"
              >
                Sign in
              </Link>
              <Link
                className={cn(
                  buttonVariants({ size: "compact" }),
                  "w-full",
                )}
                href="/register"
              >
                Create your board
              </Link>
            </nav>
          </details>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-75px)] max-w-content items-center gap-14 px-6 py-10 md:px-10 md:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:gap-20">
        <section className="max-w-2xl">
          <p className="mb-7 inline-flex rounded-pill bg-surface-brand px-4 py-1.5 text-xs font-bold tracking-wide text-primary">
            FEEDBACK SAAS
          </p>
          <h1 className="max-w-xl text-heading-lg leading-[1.125] font-bold tracking-tight text-foreground md:text-display md:leading-tight">
            Turn feedback into a roadmap customers trust.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            Collect feedback, prioritize what matters, and share progress.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className={cn(
                buttonVariants({ size: "compact" }),
                "w-full sm:w-auto sm:min-w-48",
              )}
              href="/register"
            >
              Create your board
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "compact", variant: "secondary" }),
                "w-full sm:w-auto sm:min-w-48",
              )}
              href="/login"
            >
              View live demo
            </Link>
          </div>
        </section>

        <aside
          aria-label="Product summary"
          className="w-full max-w-xl justify-self-center rounded-surface bg-surface p-6 md:p-8 lg:justify-self-end"
        >
          <p className="text-base font-bold text-foreground">
            128 feedback · 1.8k votes
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            A complete SaaS loop.
          </p>
        </aside>
      </main>
    </div>
  );
}
