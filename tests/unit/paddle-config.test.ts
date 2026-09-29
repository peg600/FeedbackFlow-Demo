import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validEnvironment = {
  PADDLE_API_KEY: "pdl_sdbx_apikey_private_fixture",
  PADDLE_NOTIFICATION_WEBHOOK_SECRET: "private_webhook_fixture",
  PADDLE_PRICE_ID_PRO: `pri_${"a".repeat(26)}`,
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_public_fixture",
};

describe("Paddle configuration diagnostics", () => {
  let readPaddleConfig: typeof import("@/features/billing/server/config").readPaddleConfig;
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T00:00:00Z"));
    errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    ({ readPaddleConfig } = await import("@/features/billing/server/config"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reports every missing required variable without throwing", () => {
    expect(readPaddleConfig({})).toBeNull();
    expect(errorLog).toHaveBeenCalledExactlyOnceWith("Paddle configuration invalid", {
      code: "BILLING_NOT_CONFIGURED",
      issues: Object.keys(validEnvironment).map((variable) => ({
        variable,
        reason: "missing",
        expected: expect.any(String),
      })),
    });
  });

  it.each([
    ["PADDLE_API_KEY", undefined, "missing"],
    ["PADDLE_API_KEY", "   ", "missing"],
    ["PADDLE_API_KEY", " pdl_sdbx_apikey_private_fixture", "surrounding_whitespace"],
    ["PADDLE_API_KEY", '"pdl_sdbx_apikey_private_fixture"', "surrounding_quotes"],
    ["PADDLE_PRICE_ID_PRO", `${validEnvironment.PADDLE_PRICE_ID_PRO} `, "surrounding_whitespace"],
    ["PADDLE_PRICE_ID_PRO", `'${validEnvironment.PADDLE_PRICE_ID_PRO}'`, "surrounding_quotes"],
    ["PADDLE_API_KEY", "pdl_live_apikey_private_fixture", "live_credentials_not_allowed"],
    ["NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "live_private_fixture", "live_credentials_not_allowed"],
    ["NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "ctkn_private_fixture", "token_id_instead_of_token"],
    ["PADDLE_NOTIFICATION_WEBHOOK_SECRET", "too_short", "invalid_format"],
    ["PADDLE_PRICE_ID_PRO", "pri_invalid", "invalid_format"],
    ["NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "invalid_private_fixture", "invalid_format"],
  ])("identifies %s failure (%s) as %s", (variable, value, reason) => {
    expect(readPaddleConfig({ ...validEnvironment, [variable as string]: value })).toBeNull();
    expect(errorLog).toHaveBeenCalledExactlyOnceWith("Paddle configuration invalid", {
      code: "BILLING_NOT_CONFIGURED",
      issues: [{ variable, reason, expected: expect.any(String) }],
    });
  });

  it("logs only allowlisted field descriptions, never environment values or raw validation errors", () => {
    const environment = {
      ...validEnvironment,
      PADDLE_API_KEY: "sensitive_invalid_api_key",
      PADDLE_NOTIFICATION_WEBHOOK_SECRET: "secret_short",
      DATABASE_URL: "postgres://private-user:private-password@private-host/database",
      BETTER_AUTH_SECRET: "unrelated_auth_secret_fixture",
    };
    expect(readPaddleConfig(environment)).toBeNull();
    const output = JSON.stringify(errorLog.mock.calls);
    for (const value of Object.values(environment)) expect(output).not.toContain(value);
    expect(output).not.toContain("DATABASE_URL");
    expect(output).not.toContain("BETTER_AUTH_SECRET");
    expect(errorLog).toHaveBeenCalledExactlyOnceWith("Paddle configuration invalid", {
      code: "BILLING_NOT_CONFIGURED",
      issues: [
        { variable: "PADDLE_API_KEY", reason: "invalid_format", expected: expect.any(String) },
        { variable: "PADDLE_NOTIFICATION_WEBHOOK_SECRET", reason: "invalid_format", expected: expect.any(String) },
      ],
    });
  });

  it("returns valid configuration without emitting diagnostics", () => {
    expect(readPaddleConfig(validEnvironment)).toEqual({
      apiKey: validEnvironment.PADDLE_API_KEY,
      webhookSecret: validEnvironment.PADDLE_NOTIFICATION_WEBHOOK_SECRET,
      priceId: validEnvironment.PADDLE_PRICE_ID_PRO,
      clientToken: validEnvironment.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("suppresses the same diagnosis for 60 seconds even if rejected secret values change", () => {
    readPaddleConfig({ ...validEnvironment, PADDLE_API_KEY: "invalid_first_secret" });
    vi.advanceTimersByTime(59_999);
    readPaddleConfig({ ...validEnvironment, PADDLE_API_KEY: "invalid_second_secret" });
    expect(errorLog).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    readPaddleConfig({ ...validEnvironment, PADDLE_API_KEY: "invalid_second_secret" });
    expect(errorLog).toHaveBeenCalledTimes(2);
  });

  it("immediately reports a changed field or failure reason", () => {
    readPaddleConfig({ ...validEnvironment, PADDLE_API_KEY: undefined });
    readPaddleConfig({ ...validEnvironment, PADDLE_API_KEY: "pdl_live_apikey_fixture" });
    readPaddleConfig({ ...validEnvironment, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: undefined });
    expect(errorLog).toHaveBeenCalledTimes(3);
  });

  it("clears suppression after valid configuration so a returning failure is observable", () => {
    readPaddleConfig({ ...validEnvironment, PADDLE_API_KEY: undefined });
    readPaddleConfig(validEnvironment);
    readPaddleConfig({ ...validEnvironment, PADDLE_API_KEY: undefined });
    expect(errorLog).toHaveBeenCalledTimes(2);
  });
});
