import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validSecret = "x".repeat(32);

describe("server environment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@example.com/db");
    vi.stubEnv("BETTER_AUTH_SECRET", validSecret);
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers an explicit branch-scoped Better Auth URL", async () => {
    vi.stubEnv(
      "BETTER_AUTH_URL",
      "https://feedback-flow-demo-git-develop.example.com",
    );
    vi.stubEnv("VERCEL_URL", "feedback-flow-demo-commit.example.com");

    const { env } = await import("@/lib/env");

    expect(env.BETTER_AUTH_URL).toBe(
      "https://feedback-flow-demo-git-develop.example.com",
    );
  });

  it("uses the current deployment URL for other Preview branches", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("VERCEL_URL", "feedback-flow-demo-commit.example.com");

    const { env } = await import("@/lib/env");

    expect(env.BETTER_AUTH_URL).toBe(
      "https://feedback-flow-demo-commit.example.com",
    );
  });

  it("does not use a deployment URL outside Preview", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "feedback-flow-demo-commit.example.com");

    await expect(import("@/lib/env")).rejects.toThrow(
      "Invalid server environment variables: BETTER_AUTH_URL",
    );
  });
});
