import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/validators/auth";

describe("auth password validation", () => {
  it("accepts passwords at the 128 character limit", () => {
    const password = "a".repeat(128);

    expect(
      loginSchema.safeParse({
        email: "paul@example.com",
        password,
        remember: false,
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        name: "Paul",
        email: "paul@example.com",
        password,
      }).success,
    ).toBe(true);
  });

  it("rejects passwords longer than 128 characters", () => {
    const password = "a".repeat(129);

    expect(
      loginSchema.safeParse({
        email: "paul@example.com",
        password,
        remember: false,
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Paul",
        email: "paul@example.com",
        password,
      }).success,
    ).toBe(false);
  });
});
