"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button, buttonVariants } from "@/components/ui/button";
import { FREE_FEEDBACK_LIMIT } from "@/features/billing/limits";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const dismissedKey = "feedbackflow-demo-guide-dismissed-v1";
const steps = [
  {
    title: "Explore as a visitor",
    description: "Browse the public feedback board, search ideas, and open the roadmap. No account is needed to look around.",
  },
  {
    title: "Join the conversation",
    description: "Sign in to submit feedback and vote. Use the demo account shown on the sign-in page when available, or register your own account.",
  },
  {
    title: "Try the owner's workflow",
    description: "Open the dashboard to manage your project's feedback. New accounts create one project first. Move feedback to Planned, In Progress, or Completed to update its public roadmap.",
  },
  {
    title: "Explore subscriptions",
    description: "Free projects can collect up to {count} feedback items. Visit Billing to try Pro checkout and the customer portal when sandbox payments are configured. No real money is charged.",
  },
] as const;

const stack = [
  ["Interface", "Next.js · React · TypeScript · Tailwind CSS · Radix UI"],
  ["Data & identity", "Neon PostgreSQL · Drizzle ORM · Better Auth"],
  ["Payments & deployment", "Paddle Sandbox · Vercel"],
  ["Testing", "Vitest · React Testing Library · Playwright"],
] as const;

// 首次挂载后读取标签页内的关闭记录；存储不可用时仍允许正常打开、关闭与导航。
export function DemoGuide() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        if (sessionStorage.getItem(dismissedKey) === "1") return;
      } catch {
        // 浏览器禁用存储时不阻断导览。
      }
      setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      try {
        sessionStorage.setItem(dismissedKey, "1");
      } catch {
        // 关闭无需依赖存储成功；重新挂载时可能再次展示。
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="mt-5 cursor-pointer rounded-placeholder text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          {t("Demo guide")}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-backdrop" />
        <Dialog.Content
          className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[calc(100dvh-2rem)] max-w-3xl -translate-y-1/2 overflow-y-auto overscroll-contain rounded-surface border border-border bg-background p-5 text-foreground shadow-card-hover focus:outline-none sm:p-7"
          onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus(); }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-pill bg-surface-brand px-3 py-1 text-xs font-bold text-primary">{t("A quick tour")}</span>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Dialog.Close asChild><Button variant="secondary" size="small">{t("Close guide")}</Button></Dialog.Close>
            </div>
          </div>
          <Dialog.Title ref={titleRef} tabIndex={-1} className="mt-5 text-2xl font-bold tracking-tight outline-none">{t("Welcome to FeedbackFlow")}</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">
            {t("A full-stack portfolio demo for collecting product feedback, voting on ideas, and sharing progress through a public roadmap. Try it as a visitor, then explore the project owner's tools.")}
          </Dialog.Description>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li className="min-w-0 rounded-control bg-surface p-4" key={step.title}>
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface-brand text-xs font-bold text-primary">{index + 1}</span>
                  <h3 className="text-sm font-semibold">{t(step.title)}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(step.description, { count: FREE_FEEDBACK_LIMIT })}</p>
              </li>
            ))}
          </ol>

          <details className="mt-5 rounded-control border border-border p-4">
            <summary className="cursor-pointer rounded-placeholder text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{t("Under the hood · Technology stack")}</summary>
            <dl className="mt-3 space-y-3 text-sm">
              {stack.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="font-medium">{t(label)}</dt>
                  <dd className="mt-1 leading-6 text-muted-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("The demo workspace is shared, so other visitors may change its data. Register your own account for a separate project.")}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Dialog.Close asChild>
              <Link href="/p/demo" prefetch={false} className={cn(buttonVariants(), "sm:flex-1")}>{t("Explore the feedback board")}</Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href="/dashboard" prefetch={false} className={cn(buttonVariants({ variant: "secondary" }), "sm:flex-1")}>{t("Try the dashboard")}</Link>
            </Dialog.Close>
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">{t("You can reopen this guide from the homepage at any time.")}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
