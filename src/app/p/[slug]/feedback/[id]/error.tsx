"use client";

import { Button } from "@/components/ui/button";

export default function FeedbackDetailError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-surface p-5">
      <section className="ui-card w-full max-w-md rounded-surface p-8 text-center">
        <h1 className="text-heading-md font-bold text-foreground">
          Feedback is temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Try loading this page again.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </section>
    </main>
  );
}
