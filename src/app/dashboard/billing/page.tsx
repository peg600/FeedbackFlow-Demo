import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { getBillingPreview } from "@/server/services/billing-preview";
import { requireDashboardAccess } from "@/server/services/project-access";

export const metadata: Metadata = { title: "Billing | FeedbackFlow" };
const free = ["1 project", "50 feedback items", "Voting and roadmap", "Public sharing"];
const pro = ["Unlimited feedback", "Voting and roadmap", "Stripe customer portal", "Priority roadmap controls"];

export default async function BillingPage() {
  const { project } = await requireDashboardAccess();
  const billing = await getBillingPreview(project.id);
  const percent = Math.min(100, Math.round((billing.feedbackUsed / billing.feedbackLimit) * 100));
  return <main><header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-7 md:px-8 lg:px-12"><div><h1 className="text-2xl font-bold md:text-[28px]">Billing</h1><p className="mt-1 text-[13px] text-muted-foreground">Preview the plan experience before Stripe is connected.</p></div><span className="rounded-pill bg-surface-warning px-4 py-2 text-[11px] font-bold text-warning-foreground">BILLING PREVIEW</span></header><div className="space-y-8 p-5 md:p-8 lg:px-12"><section className="rounded-surface border border-border bg-background p-6"><span className="rounded-pill bg-surface-brand px-4 py-2 text-[11px] font-bold text-primary">CURRENT PLAN</span><div className="mt-5 grid gap-5 md:grid-cols-[160px_1fr_220px] md:items-end"><div><h2 className="text-3xl font-bold">{billing.plan}</h2><p className="mt-1 text-xs text-muted-foreground">{billing.feedbackUsed} of {billing.feedbackLimit} feedback items used</p></div><div className="h-2 rounded-pill bg-border"><div className="h-full rounded-pill bg-primary" style={{ width: `${percent}%` }} /></div><p className="text-xs font-semibold">No recurring charge<br/><span className="font-normal text-muted-foreground">Source: local database</span></p></div></section><section><h2 className="mb-5 text-xl font-bold">Choose a plan</h2><div className="grid gap-5 lg:grid-cols-2"><PlanCard title="Free" price="$0" description="For a focused public feedback board." features={free} current /><PlanCard title="Pro" price="$19" description="Per month · test payment only" features={pro} /></div></section><section className="rounded-surface bg-surface-success p-6"><h2 className="font-bold">Stripe integration not configured</h2><p className="mt-2 max-w-2xl text-xs text-text">Upgrade, customer portal, and webhook synchronization are intentionally disabled. This preview does not create a checkout session or change subscription data.</p></section></div></main>;
}

function PlanCard({ title, price, description, features, current = false }: { title: string; price: string; description: string; features: string[]; current?: boolean }) {
  return <article className={`rounded-surface border bg-background p-6 ${current ? "border-border" : "border-primary"}`}><h3 className="text-lg font-bold">{title}</h3><p className="mt-4 text-4xl font-bold">{price}</p><p className="mt-2 text-[13px] text-muted-foreground">{description}</p><ul className="my-8 space-y-4 text-xs font-semibold">{features.map((feature) => <li key={feature}>✓&nbsp; {feature}</li>)}</ul><Button className="w-full" disabled>{current ? "Current plan" : "Upgrade unavailable"}</Button></article>;
}
