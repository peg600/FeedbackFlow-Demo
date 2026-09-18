import { describe, expect, it } from "vitest";

import {
  normalizeNeonHost,
  readTestDatabaseEnvironment,
} from "../helpers/test-database";

const pooled = "postgresql://user:password@ep-calm-test-123-pooler.us-east-2.aws.neon.tech/test?sslmode=require";
const direct = "postgresql://user:password@ep-calm-test-123.us-east-2.aws.neon.tech/test?sslmode=require";
const expectedHost = "ep-calm-test-123.us-east-2.aws.neon.tech";

describe("test database environment", () => {
  const testEnvironment = {
    TEST_DATABASE_URL: pooled,
    TEST_DATABASE_URL_UNPOOLED: direct,
    TEST_DATABASE_EXPECTED_HOST: expectedHost,
  };

  it("rejects a known production endpoint even when no active URL is exported", () => {
    expect(() => readTestDatabaseEnvironment(testEnvironment, [direct])).toThrow("configured application endpoint");
  });

  it("requires the migration URL to be direct and use the same database", () => {
    expect(() => readTestDatabaseEnvironment({ ...testEnvironment, TEST_DATABASE_URL_UNPOOLED: pooled }, [])).toThrow("direct endpoint");
    expect(() => readTestDatabaseEnvironment({ ...testEnvironment, TEST_DATABASE_URL_UNPOOLED: direct.replace("/test?", "/other?") }, [])).toThrow("same database");
  });
  it("normalizes Neon pooled endpoints before comparing them", () => {
    expect(normalizeNeonHost(new URL(pooled).hostname)).toBe(expectedHost);
    expect(readTestDatabaseEnvironment({
      TEST_DATABASE_URL: pooled,
      TEST_DATABASE_URL_UNPOOLED: direct,
      TEST_DATABASE_EXPECTED_HOST: expectedHost,
    })).toMatchObject({ normalizedHost: expectedHost });
  });

  it("rejects a missing explicit test endpoint guard", () => {
    expect(() => readTestDatabaseEnvironment({
      TEST_DATABASE_URL: pooled,
      TEST_DATABASE_URL_UNPOOLED: direct,
    })).toThrow("TEST_DATABASE_EXPECTED_HOST is required");
  });

  it("refuses to write to the active database endpoint", () => {
    expect(() => readTestDatabaseEnvironment({
      DATABASE_URL: pooled,
      TEST_DATABASE_URL: pooled,
      TEST_DATABASE_URL_UNPOOLED: direct,
      TEST_DATABASE_EXPECTED_HOST: expectedHost,
    })).toThrow("must not target the active DATABASE_URL");
  });

  it("rejects a development or production alias even when it is named as a test URL", () => {
    expect(() => readTestDatabaseEnvironment({
      TEST_DATABASE_URL: "postgresql://user:password@ep-production-123.us-east-2.aws.neon.tech/test",
      TEST_DATABASE_URL_UNPOOLED: "postgresql://user:password@ep-production-123.us-east-2.aws.neon.tech/test",
      TEST_DATABASE_EXPECTED_HOST: "ep-production-123.us-east-2.aws.neon.tech",
    })).toThrow("must not target a dev or production endpoint alias");
  });
});
