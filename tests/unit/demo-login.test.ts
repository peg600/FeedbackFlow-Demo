import { describe, expect, it } from "vitest";

import { getDemoLoginCredentials } from "@/features/auth/server/demo-login";

const configured = {
  DEMO_LOGIN_ENABLED: "true",
  DEMO_USER_EMAIL: " Interviewer@Example.com ",
  DEMO_USER_PASSWORD: " DemoFixture123! ",
};

describe("getDemoLoginCredentials", () => {
  it.each([undefined, "false", "TRUE", "1"])("requires explicit opt-in: %s", (flag) => {
    expect(getDemoLoginCredentials({ ...configured, DEMO_LOGIN_ENABLED: flag })).toBeUndefined();
  });

  it.each([
    { DEMO_USER_EMAIL: undefined },
    { DEMO_USER_PASSWORD: undefined },
    { DEMO_USER_EMAIL: "invalid" },
    { DEMO_USER_PASSWORD: "short" },
    { DEMO_USER_PASSWORD: "a".repeat(129) },
  ])("omits incomplete or invalid optional configuration: %j", (override) => {
    expect(getDemoLoginCredentials({ ...configured, ...override })).toBeUndefined();
  });

  it("projects only designated credentials and preserves the password exactly", () => {
    expect(getDemoLoginCredentials({
      ...configured,
      DATABASE_URL: "private-database-fixture",
      BETTER_AUTH_SECRET: "private-auth-fixture",
      PADDLE_API_KEY: "private-paddle-fixture",
    })).toEqual({ email: "interviewer@example.com", password: " DemoFixture123! " });
  });
});
