import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), overview: vi.fn(), redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/services/project-access", () => ({ requireDashboardAccess: mocks.access }));
vi.mock("@/server/services/billing", () => ({ getBillingOverview: mocks.overview }));
vi.mock("@/lib/paddle-config", () => ({ readPaddleConfig: () => null }));
vi.mock("@/features/billing/components/billing-panel", () => ({ BillingPanel: () => null }));
import BillingPage from "@/app/dashboard/billing/page";

describe("billing default payment links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ session: { user: { id: "owner" } }, project: { id: "project" } });
    mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    mocks.overview.mockResolvedValue({ plan: "Free" });
  });
  it("removes URL-supplied transaction IDs before rendering Paddle.js", async () => {
    await expect(BillingPage({ searchParams: Promise.resolve({ _ptxn: "txn_someone_else" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.access).toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard/billing?checkout=pending");
    expect(mocks.overview).not.toHaveBeenCalled();
  });
  it("renders return state from the signed-in owner's local overview", async () => {
    const page = await BillingPage({ searchParams: Promise.resolve({ checkout: "return" }) });
    expect(mocks.overview).toHaveBeenCalledWith("owner", "project");
    expect(page.props.initial.plan).toBe("Free");
    expect(page.props.returned).toBe(true);
  });
});
