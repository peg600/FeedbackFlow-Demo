import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaddleEventData } from "@paddle/paddle-js";

const mocks = vi.hoisted(() => ({ checkout: vi.fn(), portal: vi.fn(), status: vi.fn(), reconcile: vi.fn(), refresh: vi.fn(), initialize: vi.fn(), open: vi.fn() }));
let paddleEventCallback: ((event: PaddleEventData) => void) | undefined;
vi.mock("next/navigation", () => {
  const router = { refresh: mocks.refresh };
  return { useRouter: () => router };
});
vi.mock("@paddle/paddle-js", () => ({ initializePaddle: mocks.initialize }));
vi.mock("@/features/billing/actions", () => ({ createCheckoutAction: mocks.checkout, createPortalAction: mocks.portal, getBillingStatusAction: mocks.status, reconcileBillingAction: mocks.reconcile }));
import { BillingPanel } from "@/features/billing/components/billing-panel";
import { ACTION_NETWORK_ERROR } from "@/lib/action-errors";

const free = { plan: "Free" as const, feedbackUsed: 50, feedbackLimit: 50, configured: true, hasCustomer: true, status: "none", currentPeriodEnd: null, scheduledAction: null, scheduledChangeAt: null, checkoutPending: false, lastReconciledAt: null };

describe("Billing payment confirmation UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.initialize.mockImplementation((options: { eventCallback: (event: PaddleEventData) => void }) => {
      paddleEventCallback = options.eventCallback;
      return Promise.resolve({ Checkout: { open: mocks.open } });
    });
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

  it.each([
    ["checkout", "Upgrade to Pro"],
    ["portal", "Manage billing"],
    ["reconcile", "Refresh status"],
  ] as const)("shows the server error for %s and keeps Free access", async (action, button) => {
    const message = "Unable to start checkout. Refresh billing status before trying again.";
    mocks[action].mockResolvedValue({ serverError: { code: "INTERNAL_ERROR", message, requestId: "test-request-id" } });
    const { container } = render(<BillingPanel initial={free} clientToken="test_fixture" returned={false} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: button })); });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(container).not.toContainElement(alert);
    expect(screen.getByRole("heading", { level: 2, name: "Free" })).toBeVisible();
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: button })).toBeEnabled();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: button })); });
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss error" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: button })); });
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it.each([
    ["checkout", "Upgrade to Pro"],
    ["portal", "Manage billing"],
    ["reconcile", "Refresh status"],
  ] as const)("shows a safe network error when %s rejects", async (action, button) => {
    mocks[action].mockRejectedValue(new Error("private provider details"));
    render(<BillingPanel initial={free} clientToken="test_fixture" returned={false} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: button })); });
    expect(screen.getByRole("alert")).toHaveTextContent(ACTION_NETWORK_ERROR);
    expect(screen.queryByText("private provider details")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: button })).toBeEnabled();
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each(["server", "network"] as const)("reports %s errors during confirmation without granting Pro or stacking alerts", async (failure) => {
    const message = "Unable to read billing status. Please try again.";
    for (const action of [mocks.reconcile, mocks.status]) {
      if (failure === "server") action.mockResolvedValue({ serverError: { message } });
      else action.mockRejectedValue(new Error("private polling details"));
    }
    render(<BillingPanel initial={free} clientToken="test_fixture" returned />);
    await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
    expect(mocks.reconcile).toHaveBeenCalledTimes(1);
    expect(mocks.status).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(failure === "server" ? message : ACTION_NETWORK_ERROR);
    expect(screen.getByRole("heading", { level: 2, name: "Free" })).toBeVisible();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each(["server", "network"] as const)("reports %s errors when returning focus to Billing", async (failure) => {
    const message = "Unable to refresh billing status.";
    if (failure === "server") mocks.reconcile.mockResolvedValue({ serverError: { message } });
    else mocks.reconcile.mockRejectedValue(new Error("private reconciliation details"));
    render(<BillingPanel initial={free} clientToken="test_fixture" returned={false} />);
    await act(async () => { fireEvent.focus(window); });
    expect(mocks.reconcile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(failure === "server" ? message : ACTION_NETWORK_ERROR);
    expect(screen.getByRole("heading", { level: 2, name: "Free" })).toBeVisible();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("keeps a dismissed recurring polling error quiet until billing has recovered", async () => {
    const result = { serverError: { message: "Unable to read billing status. Please try again." } };
    mocks.reconcile.mockResolvedValue(result);
    mocks.status.mockResolvedValue(result);
    render(<BillingPanel initial={free} clientToken="test_fixture" returned />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("alert")).toHaveTextContent(result.serverError.message);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss error" }));

    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(mocks.status).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    mocks.status.mockResolvedValue({ data: free });
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    mocks.status.mockResolvedValue(result);
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(screen.getByRole("alert")).toHaveTextContent(result.serverError.message);
    expect(screen.getByRole("heading", { level: 2, name: "Free" })).toBeVisible();
  });

  it.each(["checkout.error", "checkout.payment.error", "checkout.payment.failed"] as const)("reports Paddle %s without granting Pro", async (name) => {
    render(<BillingPanel initial={free} clientToken="test_fixture" returned={false} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Upgrade to Pro" })); });
    expect(paddleEventCallback).toBeTypeOf("function");
    act(() => { paddleEventCallback?.({ name } as PaddleEventData); });
    expect(screen.getByRole("alert")).toHaveTextContent("Payment could not be completed. You can retry the same checkout safely.");
    expect(screen.getByRole("heading", { level: 2, name: "Free" })).toBeVisible();
    expect(mocks.open).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
