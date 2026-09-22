import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), limit: vi.fn(), select: vi.fn(), checkout: vi.fn(), portal: vi.fn(), status: vi.fn(), reconcile: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock("@/server/rate-limit", () => ({ enforceWriteRateLimit: mocks.limit }));
vi.mock("@/server/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/server/services/billing", () => ({ createBillingCheckout: mocks.checkout, createBillingPortal: mocks.portal, getBillingOverview: mocks.status, reconcileBilling: mocks.reconcile }));
import { createCheckoutAction, createPortalAction, getBillingStatusAction, reconcileBillingAction } from "@/features/billing/actions";

describe("billing action ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ user: { id: "current-user", email: "user@example.invalid", name: "User" } });
    mocks.limit.mockResolvedValue(undefined);
    mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: "current-project" }] }) }) });
    mocks.checkout.mockResolvedValue({ transactionId: "transaction" });
    mocks.portal.mockResolvedValue({ url: "https://sandbox-customer-portal.paddle.com/example" });
  });
  it("rejects unauthenticated users before database, limiter and Paddle", async () => {
    mocks.session.mockResolvedValue(null);
    for (const action of [createCheckoutAction, createPortalAction, getBillingStatusAction, reconcileBillingAction]) {
      expect((await action({})).serverError?.code).toBe("UNAUTHENTICATED");
    }
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
  });
  it("rejects client-supplied ownership identifiers before API access", async () => {
    const result = await createPortalAction({ customerId: "victim" } as unknown as Record<string, never>);
    expect(result.validationErrors).toBeDefined();
    expect(mocks.portal).not.toHaveBeenCalled();
  });
  it("binds checkout and portal to the current session", async () => {
    await createCheckoutAction({});
    await createPortalAction({});
    expect(mocks.checkout).toHaveBeenCalledWith({ id: "current-user", email: "user@example.invalid", name: "User" });
    expect(mocks.portal).toHaveBeenCalledWith("current-user");
    expect(mocks.limit).toHaveBeenCalledWith("current-user", "billing.checkout");
  });
  it("polls the local model without contacting the provider", async () => {
    await getBillingStatusAction({});
    expect(mocks.status).toHaveBeenCalledWith("current-user", "current-project");
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
});
