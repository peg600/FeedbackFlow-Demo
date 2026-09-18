import { describe, expect, it, vi } from "vitest";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@/server/db/schema";
import { createRateLimitStore } from "@/server/services/rate-limit-store";

describe("atomic rate limit store boundary", () => {
  it.each([{ window: 0, max: 1 }, { window: 60, max: 0 }, { window: 1.5, max: 2 }, { window: 60, max: 1_000_001 }])(
    "rejects invalid rules before accessing the database (%o)", async (rule) => {
      const execute = vi.fn();
      const database = { execute } as unknown as NeonDatabase<typeof schema>;
      await expect(createRateLimitStore(database, "test-secret").consume("key", rule)).rejects.toThrow("Invalid rate limit rule");
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it("preserves storage decisions and retry timing", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ allowed: true, retry_after: 60 }] })
      .mockResolvedValueOnce({ rows: [{ allowed: false, retry_after: 42 }] });
    const store = createRateLimitStore({ execute } as unknown as NeonDatabase<typeof schema>, "test-secret");
    await expect(store.consume("key", { window: 60, max: 1 })).resolves.toEqual({ allowed: true, retryAfter: null });
    await expect(store.consume("key", { window: 60, max: 1 })).resolves.toEqual({ allowed: false, retryAfter: 42 });
    expect(execute).toHaveBeenCalledTimes(3);
  });
});
