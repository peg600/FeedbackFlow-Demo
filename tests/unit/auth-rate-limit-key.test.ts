import { describe, expect, it } from "vitest";
import { getAuthRateLimitKey } from "@/server/auth/rate-limit-key";

describe("bounded authentication limiter keys", () => {
  const genericRule = { window: 60, max: 100 };
  it("collapses arbitrary catch-all paths into one bucket for the same IP", () => {
    const keys = Array.from({ length: 2000 }, (_, index) =>
      getAuthRateLimitKey(`192.0.2.1|/unknown-${index}`, genericRule));
    expect(new Set(keys).size).toBe(1);
  });

  it("separates sign-in, sign-up, and other clients including IPv6", () => {
    expect(getAuthRateLimitKey("2001:db8::1|/sign-in/email", genericRule)).toBe("auth:2001:db8::1|/sign-in/email:60:100");
    expect(getAuthRateLimitKey("2001:db8::1|/sign-up/email", genericRule)).not.toBe(getAuthRateLimitKey("2001:db8::1|/sign-in/email", genericRule));
    expect(getAuthRateLimitKey("192.0.2.1|/get-session", genericRule)).not.toBe(getAuthRateLimitKey("192.0.2.2|/get-session", genericRule));
  });

  it("fails into a shared bucket if a future library version changes key shape", () => {
    expect(getAuthRateLimitKey("unknown-key-format", genericRule)).toBe("auth:no-trusted-ip|/other:60:100");
  });

  it("keeps special auth rule windows and quotas separate from generic routes", () => {
    const keys = [
      getAuthRateLimitKey("ip|/get-session", genericRule),
      getAuthRateLimitKey("ip|/change-password", { window: 10, max: 3 }),
      getAuthRateLimitKey("ip|/request-password-reset", { window: 60, max: 3 }),
    ];
    expect(new Set(keys).size).toBe(3);
  });
});
