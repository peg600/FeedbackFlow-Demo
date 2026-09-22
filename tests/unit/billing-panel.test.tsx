import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ checkout: vi.fn(), portal: vi.fn(), status: vi.fn(), reconcile: vi.fn(), refresh: vi.fn(), initialize: vi.fn(), open: vi.fn() }));
vi.mock("next/navigation", () => {
  const router = { refresh: mocks.refresh };
  return { useRouter: () => router };
});
vi.mock("@paddle/paddle-js", () => ({ initializePaddle: mocks.initialize }));
vi.mock("@/features/billing/actions", () => ({ createCheckoutAction: mocks.checkout, createPortalAction: mocks.portal, getBillingStatusAction: mocks.status, reconcileBillingAction: mocks.reconcile }));
import { BillingPanel } from "@/features/billing/components/billing-panel";

const free = { plan: "Free" as const, feedbackUsed: 50, feedbackLimit: 50, configured: true, hasCustomer: true, status: "none", currentPeriodEnd: null, scheduledAction: null, scheduledChangeAt: null, checkoutPending: false, lastReconciledAt: null };

describe("Billing payment confirmation UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.initialize.mockResolvedValue({ Checkout: { open: mocks.open } });
    mocks.reconcile.mockResolvedValue({ data: free });
    mocks.status.mockResolvedValue({ data: free });
    mocks.checkout.mockResolvedValue({ data: { transactionId: "txn_current_user" } });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it("does not grant Pro from a successful-return query parameter", async () => {
    render(<BillingPanel initial={free} clientToken="test_fixture" returned />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("heading", { name: "Confirming your subscription" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Free" })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 2, name: "Pro" })).not.toBeInTheDocument();
  });
  it("refreshes the shell when the local status becomes Pro", async () => {
    const pro = { ...free, plan: "Pro", feedbackLimit: null, status: "active" };
    mocks.reconcile.mockResolvedValue({ data: pro });
    render(<BillingPanel initial={free} clientToken="test_fixture" returned />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("heading", { level: 2, name: "Pro" })).toBeVisible();
    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.queryByText("Confirming your subscription")).not.toBeInTheDocument();
  });
  it("stops automatic polling after one minute and offers manual recovery", async () => {
    render(<BillingPanel initial={free} clientToken="test_fixture" returned />);
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    expect(screen.getByText("Subscription confirmation is taking longer")).toBeVisible();
    const count = mocks.status.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mocks.status).toHaveBeenCalledTimes(count);
    expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled();
  });
  it("opens only the server-created transaction and never passes client ownership data", async () => {
    render(<BillingPanel initial={free} clientToken="test_fixture" returned={false} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Upgrade to Pro" })); });
    expect(mocks.checkout).toHaveBeenCalledWith({});
    expect(mocks.open).toHaveBeenCalledWith({ transactionId: "txn_current_user", settings: expect.objectContaining({ allowLogout: false, successUrl: expect.stringContaining("/dashboard/billing?checkout=return") }) });
    expect(screen.getByRole("heading", { level: 2, name: "Free" })).toBeVisible();
  });
  it("disables checkout when sandbox settings are missing", () => {
    render(<BillingPanel initial={{ ...free, configured: false }} clientToken={null} returned={false} />);
    expect(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeDisabled();
    expect(screen.getByText("Sandbox billing is not configured")).toBeVisible();
  });
});
