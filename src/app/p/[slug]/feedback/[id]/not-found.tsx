import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function FeedbackDetailNotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-surface p-5">
      <section className="ui-card w-full max-w-md rounded-surface p-8 text-center">
        <p className="text-[11px] font-bold tracking-wide text-primary uppercase">
          Feedback unavailable
        </p>
        <h1 className="mt-3 text-heading-md font-bold text-foreground">
          This feedback item could not be found.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          It may be private, removed, or linked from a different project.
        </p>
        <Link className={`${buttonVariants()} mt-6`} href="/">
          Go to FeedbackFlow
        </Link>
      </section>
    </main>
  );
}
