import { describe, expect, it } from "vitest";

import { getSafeReturnTo } from "@/features/auth/safe-return-to";

describe("getSafeReturnTo", () => {
  it("keeps an internal path with its query string", () => {
    expect(getSafeReturnTo("/dashboard?status=planned")).toBe(
      "/dashboard?status=planned",
    );
  });

  it.each([
    "https://example.com",
    "//example.com/dashboard",
    "/\\example.com",
    "/login?returnTo=/login",
    "/login/",
    "/register",
    "/..//evil.example",
    "/%2e%2e//evil.example",
    "/pricing",
  ])("rejects unsafe or looping return targets: %s", (target) => {
    expect(getSafeReturnTo(target)).toBe("/dashboard");
  });
});
