import { describe, expect, it } from "vitest";

import { getAuthError } from "@/features/auth/auth-error";

describe("auth error presentation", () => {
  it("uses owned messages even when a known code carries internal details", () => {
    expect(getAuthError({ code: "INVALID_EMAIL_OR_PASSWORD", message: "SQL password details" }, "signIn"))
      .toEqual({ code: "AUTH_INVALID_CREDENTIALS", message: "Invalid email or password" });
  });

  it("does not distinguish missing users from wrong passwords at login", () => {
    expect(getAuthError({ code: "USER_NOT_FOUND" }, "signIn"))
      .toEqual(getAuthError({ code: "INVALID_PASSWORD" }, "signIn"));
  });

  it("keeps rules scoped to the auth operation", () => {
    expect(getAuthError({ code: "USER_ALREADY_EXISTS" }, "signUp").code).toBe("AUTH_EMAIL_TAKEN");
    expect(getAuthError({ code: "USER_ALREADY_EXISTS" }, "signIn").code).toBe("AUTH_SIGN_IN_FAILED");
  });

  it.each(["INTERNAL_SERVER_ERROR", "constructor", "__proto__"])("masks unknown code %s", (code) => {
    expect(getAuthError({ code, message: "database details" }, "signOut"))
      .toEqual({ code: "AUTH_SIGN_OUT_FAILED", message: "Unable to sign out. Try again." });
  });

  it("provides actionable rate limit feedback", () => {
    expect(getAuthError({ status: 429 }, "signIn").code).toBe("AUTH_RATE_LIMITED");
  });
});
