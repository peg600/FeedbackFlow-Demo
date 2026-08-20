"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return <main className="flex min-h-[60svh] items-center justify-center bg-surface p-6"><div className="ui-card max-w-md p-8 text-center"><h1 className="text-heading-sm font-bold">Dashboard unavailable</h1><p className="mt-2 text-sm text-muted-foreground">We could not load your feedback. Try again.</p><Button className="mt-5" onClick={reset}>Try again</Button></div></main>;
}
