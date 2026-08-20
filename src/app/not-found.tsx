import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { iconPaths } from "@/lib/icons";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <Link
      href="/"
      aria-label="FeedbackFlow home"
      className="inline-flex items-center gap-2.5 rounded-control"
    >
      <Image
        src={iconPaths.logoMark}
        alt=""
        width={32}
        height={32}
        aria-hidden="true"
        priority
      />
      <span className="text-base font-bold text-foreground">FeedbackFlow</span>
    </Link>
  );
}

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-[72px] shrink-0 items-center border-b border-border bg-background px-5 md:px-[50px]">
        <Brand />
      </header>

      <main className="flex flex-1 justify-center px-5 py-10 md:py-[92px]">
        <section
          aria-labelledby="not-found-heading"
          className="h-[610px] w-full max-w-[350px] rounded-[28px] bg-background px-5 pt-[34px] md:h-[650px] md:max-w-[569px] md:px-[18px]"
        >
          <div
            aria-hidden="true"
            className="mx-auto flex h-[150px] w-[232px] items-center justify-center rounded-[20px] bg-surface-warning md:w-[249px]"
          >
            <div className="flex size-[104px] items-center justify-center rounded-full bg-background text-5xl font-bold text-warning">
              404
            </div>
          </div>

          <div className="mt-[30px] md:w-[441px]">
            <p className="inline-flex h-7 items-center rounded-pill bg-surface-warning px-7 text-[11px] font-bold text-warning-foreground">
              404 · PAGE NOT FOUND
            </p>

            <h1
              id="not-found-heading"
              className="mt-[11px] text-[29px] leading-[1.31] font-bold tracking-[-0.02em] text-foreground md:mt-0.5 md:text-[38px] md:leading-[46px]"
            >
              This page took{" "}
              <br />a wrong turn
            </h1>

            <p className="mt-[17px] text-sm leading-[23px] text-muted-foreground md:mt-2 md:text-base">
              The link may be outdated,{" "}
              <br />moved, or deleted.
            </p>

            <div className="mt-[39px] flex flex-col gap-3 md:mt-[50px] md:flex-row md:justify-between">
              <Link
                href="/"
                className={cn(buttonVariants(), "md:w-[169px]")}
              >
                Go to homepage
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "md:w-[169px]",
                )}
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
