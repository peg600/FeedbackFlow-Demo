// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reconcile: vi.fn(), config: vi.fn() }));
vi.mock("@/features/billing/server/billing", () => ({ reconcileBillingBatch: mocks.reconcile }));
vi.mock("@/features/billing/server/config", () => ({ readPaddleConfig: mocks.config }));
import { GET } from "@/app/api/cron/billing-reconcile/route";

describe("billing cron authorization", () => {
  beforeEach(() => { vi.stubEnv("CRON_SECRET", "x".repeat(32)); mocks.reconcile.mockReset().mockResolvedValue({ processed: 1, succeeded: 1, failed: 0 }); mocks.config.mockReturnValue({}); });
  afterEach(() => vi.unstubAllEnvs());
  it("rejects missing or invalid bearer credentials before reconciliation", async () => {
    for (const authorization of ["", "Bearer wrong", `Bearer ${"y".repeat(32)}`]) {
      expect((await GET(new Request("https://app.example/api/cron/billing-reconcile", { headers: { authorization } }))).status).toBe(401);
    }
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
  it("authorizes only the configured bearer and reports failed batches", async () => {
    const request = new Request("https://app.example/api/cron/billing-reconcile", { headers: { authorization: `Bearer ${"x".repeat(32)}` } });
    expect((await GET(request)).status).toBe(200);
    mocks.reconcile.mockResolvedValue({ processed: 1, succeeded: 0, failed: 1 });
    expect((await GET(request)).status).toBe(503);
  });
});
