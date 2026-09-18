import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { BETTER_AUTH_SECRET: "test-secret" } }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/services/rate-limit-store", () => ({
  createRateLimitStore: () => ({ consume: mocks.consume }),
}));

import { enforceWriteRateLimit } from "@/server/rate-limit";

describe("write rate limiting", () => {
  beforeEach(() => vi.resetAllMocks());

  it("uses the verified user and operation, not a client project or IP", async () => {
    mocks.consume.mockResolvedValue({ allowed: true, retryAfter: null });
    await enforceWriteRateLimit("session-user", "feedback.create");
    expect(mocks.consume).toHaveBeenCalledWith("action:feedback.create:session-user", { window: 60, max: 5 });
    await enforceWriteRateLimit("session-user", "feedback.vote");
    expect(mocks.consume).toHaveBeenLastCalledWith("action:feedback.vote:session-user", { window: 60, max: 30 });
  });

  it("returns the stable business error when the shared bucket is exhausted", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfter: 30 });
    await expect(enforceWriteRateLimit("user", "feedback.create")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("fails closed if shared storage is unavailable", async () => {
    mocks.consume.mockRejectedValue(new Error("storage unavailable"));
    await expect(enforceWriteRateLimit("user", "feedback.vote")).rejects.toThrow("storage unavailable");
  });
});
