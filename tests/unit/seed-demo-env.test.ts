import { describe, expect, it } from "vitest";

import { readSeedEnvironment } from "../../scripts/seed-demo";

const validEnvironment = {
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://127.0.0.1:3000",
  DATABASE_URL_UNPOOLED: "postgresql://user:password@ep-seed-test-123.us-east-2.aws.neon.tech/test?sslmode=require",
  DEMO_SEED_CONFIRM: "true",
  DEMO_USER_EMAIL: "demo@feedbackflow.invalid",
  DEMO_USER_PASSWORD: "Demo-seed-password-2026!",
};

describe("demo seed environment", () => {
  it("accepts only an explicitly confirmed direct connection and server-side credentials", () => {
    expect(readSeedEnvironment(validEnvironment)).toMatchObject({
      email: "demo@feedbackflow.invalid",
      password: "Demo-seed-password-2026!",
    });
  });

  it("refuses a pooled URL or an absent explicit confirmation", () => {
    expect(() => readSeedEnvironment({
      ...validEnvironment,
      DATABASE_URL_UNPOOLED: "postgresql://user:password@ep-seed-test-123-pooler.us-east-2.aws.neon.tech/test?sslmode=require",
    })).toThrow("direct PostgreSQL URL");
    expect(() => readSeedEnvironment({
      ...validEnvironment,
      DEMO_SEED_CONFIRM: "false",
    })).toThrow("DEMO_SEED_CONFIRM=true");
  });

  it("validates demo credentials before any database client is created", () => {
    expect(() => readSeedEnvironment({
      ...validEnvironment,
      DEMO_USER_EMAIL: "not-an-email",
    })).toThrow("valid email address");
    expect(() => readSeedEnvironment({
      ...validEnvironment,
      DEMO_USER_PASSWORD: "x".repeat(129),
    })).toThrow("minimum length requirements");
  });
});
