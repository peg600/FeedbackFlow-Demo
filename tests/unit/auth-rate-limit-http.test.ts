// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/server/env", () => ({ env: {
  BETTER_AUTH_SECRET: "test-auth-secret-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3100",
} }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/rate-limit", () => ({ rateLimitStore: { consume: mocks.consume } }));

import { auth } from "@/server/auth";

describe("Better Auth native HTTP rate limit boundary", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns native HTTP 429 and a retry hint before credential/database access", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfter: 42 });
    const response = await auth.handler(new Request("http://localhost:3100/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3100" },
      body: JSON.stringify({ email: "test@example.invalid", password: "not-used" }),
    }));
    expect(response.status).toBe(429);
    expect(response.headers.get("x-retry-after")).toBe("42");
    expect(mocks.consume).toHaveBeenCalledWith(expect.stringContaining("/sign-in/email:60:10"), { window: 60, max: 10 });
  });

  it("preserves built-in sensitive endpoint limits instead of overriding with generic rules", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfter: 9 });
    await auth.handler(new Request("http://localhost:3100/api/auth/change-password", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100" }, body: "{}",
    }));
    expect(mocks.consume).toHaveBeenCalledWith(expect.stringContaining("/other:10:3"), { window: 10, max: 3 });
  });
});
