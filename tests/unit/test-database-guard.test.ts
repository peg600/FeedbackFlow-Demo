import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { matchesTestDatabaseGuard } from "../helpers/assert-test-database";

describe("test-only database marker", () => {
  const token = "test-only-marker-with-at-least-32-characters";
  const digest = createHash("sha256").update(token).digest("hex");
  it("requires a matching independently provisioned token digest", () => {
    expect(matchesTestDatabaseGuard(token, digest)).toBe(true);
    expect(matchesTestDatabaseGuard("different-test-marker-at-least-32-characters", digest)).toBe(false);
  });
  it("rejects absent, malformed, and short markers", () => {
    expect(matchesTestDatabaseGuard(token, undefined)).toBe(false);
    expect(matchesTestDatabaseGuard(token, "not-a-hash")).toBe(false);
    expect(matchesTestDatabaseGuard("short", digest)).toBe(false);
  });
});
