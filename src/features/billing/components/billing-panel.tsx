"use client";

import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { createCheckoutAction, createPortalAction, getBillingStatusAction, reconcileBillingAction } from "@/features/billing/actions";
import { ACTION_NETWORK_ERROR, getActionErrorMessage } from "@/lib/action-errors";
import type { getBillingOverview } from "@/server/services/billing";

type Overview = Awaited<ReturnType<typeof getBillingOverview>>;
let paddlePromise: Promise<Paddle | undefined> | undefined;
let checkoutListener: ((event: PaddleEventData) => void) | undefined;

/** 复用 Paddle.js 初始化，回调由当前挂载的 Billing 页面接收。 */
function loadPaddle(token: string) {
  paddlePromise ??= initializePaddle({ environment: "sandbox", token, eventCallback: (event) => checkoutListener?.(event) })
    .catch((error: unknown) => { paddlePromise = undefined; throw error; });
  return paddlePromise;
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "—";
}

/** 结账和有界轮询使用客户端交互岛；页面上的 Pro 始终来自服务端本地订阅读取。 */
export function BillingPanel({ initial, clientToken, returned }: { initial: Overview; clientToken: string | null; returned: boolean }) {
  const router = useRouter();
  const [billing, setBilling] = useState(initial);
  const [busy, setBusy] = useState<"checkout" | "portal" | "refresh" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(returned || initial.checkoutPending);
  const [timedOut, setTimedOut] = useState(false);
  const actionInFlight = useRef(false);
  const latestPlan = useRef(initial.plan);
  const lastReconcile = useRef(0);

  // 回跳或刷新后的恢复：最多轮询一分钟，首尾各一次 API 核对，其余仅读本地数据库。
  useEffect(() => {
    if (!waiting || !billing.configured) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    /** 串行轮询以防请求堆积，超时后让用户主动重试，不把跳转当作支付成功证明。 */
    const poll = async () => {
      try {
        const reconcile = (attempts === 0 || attempts === 19) && Date.now() - lastReconcile.current > 25_000;
        if (reconcile) lastReconcile.current = Date.now();
        const result = await (reconcile ? reconcileBillingAction({}) : getBillingStatusAction({}));
        if (stopped) return;
        if (result?.data) {
          setBilling(result.data);
          if (result.data.plan === "Pro") {
            latestPlan.current = "Pro";
            setWaiting(false);
            setTimedOut(false);
            window.history.replaceState(window.history.state, "", "/dashboard/billing");
            router.refresh();
            return;
          }
        }
      } catch { /* 短暂网络错误继续重试，达到上限后显示恢复操作。 */ }
      if (stopped) return;
      if (++attempts >= 20) { setTimedOut(true); setWaiting(false); }
      else timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [waiting, billing.configured, router]);

  useEffect(() => {
    checkoutListener = (event) => {
      if (event.name === "checkout.completed") { setWaiting(true); setTimedOut(false); setMessage(null); }
      if (event.name === "checkout.error" || event.name === "checkout.payment.error") {
        setMessage("Payment could not be completed. You can retry the same checkout safely.");
      }
    };
    return () => { checkoutListener = undefined; };
  }, []);

  // 从门户切回本页时按冷却时间核对状态，防止窗口焦点变化造成大量支付 API 请求。
  useEffect(() => {
    if (!billing.hasCustomer || !billing.configured) return;
    let stopped = false;
    const onFocus = async () => {
      if (actionInFlight.current || Date.now() - lastReconcile.current < 30_000) return;
      lastReconcile.current = Date.now();
      try {
        const result = await reconcileBillingAction({});
        if (!stopped && result?.data) {
          setBilling(result.data);
          if (latestPlan.current !== result.data.plan) { latestPlan.current = result.data.plan; router.refresh(); }
        }
      } catch { /* Refresh status 可手动恢复。 */ }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);
    return () => { stopped = true; window.removeEventListener("focus", onFocus); window.removeEventListener("pageshow", onFocus); };
  }, [billing.hasCustomer, billing.configured, router]);

  /** 浏览器防重点击与服务端锁配合；只提交空输入，客户、价格与权限全部在服务器确定。 */
  async function runAction(kind: "checkout" | "portal" | "refresh") {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "checkout") {
        if (!clientToken) throw new Error("Billing unavailable");
        const paddle = await loadPaddle(clientToken);
        if (!paddle) throw new Error("Checkout unavailable");
        const result = await createCheckoutAction({});
        if (!result?.data) { setMessage(getActionErrorMessage(result) ?? "Unable to start checkout."); return; }
        window.history.replaceState(window.history.state, "", "/dashboard/billing?checkout=pending");
        paddle.Checkout.open({ transactionId: result.data.transactionId,
          settings: { displayMode: "overlay", variant: "one-page", allowLogout: false,
            successUrl: `${window.location.origin}/dashboard/billing?checkout=return` } });
        setBilling((previous) => ({ ...previous, hasCustomer: true, checkoutPending: true }));
        setTimedOut(false);
        setWaiting(true);
      } else if (kind === "portal") {
        const result = await createPortalAction({});
        if (result?.data) window.location.assign(result.data.url);
        else setMessage(getActionErrorMessage(result) ?? "Unable to open billing management.");
      } else {
        lastReconcile.current = Date.now();
        const result = await reconcileBillingAction({});
        if (result?.data) {
          setBilling(result.data);
          if (latestPlan.current !== result.data.plan) { latestPlan.current = result.data.plan; router.refresh(); }
          if (result.data.plan === "Pro") {
            setWaiting(false); setTimedOut(false);
            window.history.replaceState(window.history.state, "", "/dashboard/billing");
          }
          setMessage(`Billing status refreshed. Your current plan is ${result.data.plan}.`);
        } else setMessage(getActionErrorMessage(result) ?? "Unable to refresh billing status.");
      }
    } catch { setMessage(ACTION_NETWORK_ERROR); }
    finally { actionInFlight.current = false; setBusy(null); }
  }

  const manageable = ["active", "trialing", "past_due", "paused"].includes(billing.status);
  return <main>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-7 md:px-8 lg:px-12">
      <div><h1 className="text-heading-lg font-bold">Billing</h1><p className="mt-1 text-body-sm text-muted-foreground">Manage your plan and subscription.</p></div>
      <span className="rounded-pill bg-surface-warning px-4 py-2 text-xs font-bold text-warning-foreground">PADDLE SANDBOX</span>
    </header>
    <div className="space-y-8 p-5 md:p-8 lg:px-12">
      {!billing.configured && <section className="rounded-surface bg-surface-warning p-6"><h2 className="font-bold">Sandbox billing is not configured</h2><p className="mt-2 text-body-sm">You can keep using Free. Checkout will be available once sandbox setup is complete.</p></section>}
      {(waiting || timedOut) && <section aria-live="polite" className="rounded-surface bg-surface-info p-6"><h2 className="font-bold">{waiting ? "Confirming your subscription" : "Subscription confirmation is taking longer"}</h2><p className="mt-2 text-body-sm">{waiting ? "We are checking your billing status. Pro will appear automatically when your subscription is confirmed." : "You can leave this page and return later, or refresh status. If you already paid, please do not start another purchase."}</p></section>}
      {message && <p role="status" className="rounded-control border border-border bg-background p-4 text-body-sm">{message}</p>}
      <section aria-labelledby="current-plan" className="rounded-surface border border-border bg-background p-6">
        <p className="text-xs font-bold text-primary">CURRENT PLAN</p>
        <div className="mt-4 grid min-w-0 gap-5 md:grid-cols-2"><div><h2 id="current-plan" className="text-heading-lg font-bold">{billing.plan}</h2><p className="mt-2 text-body-sm text-muted-foreground">{billing.feedbackUsed} {billing.plan === "Pro" ? "feedback items · unlimited" : "of 50 feedback items used"}</p></div>
          <div className="min-w-0 text-body-sm"><p className="font-semibold">{billing.status === "none" ? "No subscription" : `Subscription: ${billing.status.replaceAll("_", " ")}`}</p>
            {billing.currentPeriodEnd && <p className="mt-1">Current period ends {dateLabel(billing.currentPeriodEnd)} (UTC)</p>}
            {billing.scheduledAction && <p className="mt-1">Scheduled {billing.scheduledAction}: {dateLabel(billing.scheduledChangeAt)} (UTC)</p>}
            {billing.status === "past_due" && <p className="mt-2 text-warning-foreground">Update your payment method in Manage billing to restore Pro.</p>}
            {billing.plan === "Free" && billing.status === "active" && <p className="mt-2">Pro access is awaiting an up-to-date billing period. Refresh status to check.</p>}
          </div>
        </div>
        {billing.plan === "Free" && <div aria-label="Free plan feedback usage" role="progressbar" aria-valuenow={Math.min(billing.feedbackUsed, 50)} aria-valuemin={0} aria-valuemax={50} className="mt-5 h-2 overflow-hidden rounded-pill bg-border"><div className="h-full rounded-pill bg-primary" style={{ width: `${Math.min(100, billing.feedbackUsed / 50 * 100)}%` }} /></div>}
        <div className="mt-6 flex flex-wrap gap-3">
          {billing.hasCustomer && <Button disabled={Boolean(busy)} onClick={() => void runAction("portal")}>{busy === "portal" ? "Opening…" : "Manage billing"}</Button>}
          <Button variant="secondary" disabled={Boolean(busy) || !billing.configured} onClick={() => void runAction("refresh")}>{busy === "refresh" ? "Refreshing…" : "Refresh status"}</Button>
        </div>
      </section>
      <section aria-labelledby="choose-plan"><h2 id="choose-plan" className="mb-5 text-heading-md font-bold">Choose a plan</h2><div className="grid gap-5 lg:grid-cols-2">
        <PlanCard title="Free" price="$0" description="For a focused public feedback board." features={["1 project", "50 feedback items", "Voting and public roadmap"]}><Button className="w-full" disabled>{billing.plan === "Free" ? "Current plan" : "Cancel renewal in Manage billing"}</Button></PlanCard>
        <PlanCard title="Pro" price="$19" description="USD per month · taxes calculated at checkout" features={["1 project", "Unlimited feedback", "Voting and public roadmap", "Self-service billing portal"]}><Button className="w-full" disabled={Boolean(busy) || !billing.configured || manageable} onClick={() => void runAction("checkout")}>{busy === "checkout" ? "Opening checkout…" : billing.plan === "Pro" ? "Current plan" : manageable ? "Manage existing subscription" : billing.checkoutPending ? "Resume checkout" : "Upgrade to Pro"}</Button></PlanCard>
      </div></section>
      <p className="text-body-sm text-muted-foreground">Test payments only. No real money is charged. Cancel renewal, update your payment method, and view invoices in Manage billing. Existing feedback remains available when Pro ends.</p>
    </div>
  </main>;
}

function PlanCard({ title, price, description, features, children }: { title: string; price: string; description: string; features: string[]; children: ReactNode }) {
  return <article className="flex min-w-0 flex-col rounded-surface border border-border bg-background p-6"><h3 className="text-heading-sm font-bold">{title}</h3><p className="mt-4 text-display font-bold">{price}</p><p className="mt-2 text-body-sm text-muted-foreground">{description}</p><ul className="my-8 flex-1 space-y-4 text-body-sm">{features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>{children}</article>;
}
