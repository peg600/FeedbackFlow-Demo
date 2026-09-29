import { ApiError } from "@paddle/paddle-node-sdk";
import { PostgresError } from "pg-error-enum";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { businessError } from "@/lib/errors";
import { actionClient, normalizeActionError } from "@/server/safe-action";

const inputSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
});

describe("actionClient", () => {
  it.each(["invalid_token", "forbidden", "transaction_default_checkout_url_not_set", "sensitive_unknown_code"])(
    "logs only allowlisted Paddle diagnostics for %s with the same application request ID",
    (code) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        const error = new ApiError({ type: "request_error", code,
          detail: "private payment detail", documentation_url: "https://private-url.example/secret",
          errors: [{ field: "private_field", message: "private submitted value" }],
        }, 123);
        const result = normalizeActionError(error, "billing.checkout");
        expect(result).toEqual({ code: "INTERNAL_ERROR", message: "Unable to start checkout. Refresh billing status before trying again.", requestId: expect.any(String) });
        expect(log).toHaveBeenCalledExactlyOnceWith("Safe action failed", {
          code: "INTERNAL_ERROR", operation: "billing.checkout", requestId: result.requestId,
          paddle: { code: code === "sensitive_unknown_code" ? "unknown_provider_error" : code, type: "request_error" },
        });
      } finally { log.mockRestore(); }
    },
  );

  it("does not trust provider-shaped plain errors or unknown provider types", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      normalizeActionError(Object.assign(new Error("private"), { code: "invalid_token", type: "request_error" }), "billing.checkout");
      expect(log.mock.calls[0][1]).not.toHaveProperty("paddle");
      normalizeActionError(new ApiError({ type: "sensitive_unknown_type", code: "invalid_token", detail: "private", documentation_url: "private" }, null), "billing.checkout");
      expect(log.mock.calls[1][1]).toMatchObject({ paddle: { code: "invalid_token", type: "unknown" } });
      expect(JSON.stringify(log.mock.calls)).not.toContain("private");
      expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive_unknown_type");
    } finally { log.mockRestore(); }
  });

  it("returns flattened validation errors without running server code", async () => {
    const serverCode = vi.fn();
    const action = actionClient
      .metadata({ operation: "feedback.create" })
      .inputSchema(inputSchema)
      .action(serverCode);

    const result = await action({ title: "x" });

    expect(result.validationErrors).toEqual({
      fieldErrors: { title: ["Title must be at least 3 characters."] },
      formErrors: [],
    });
    expect(serverCode).not.toHaveBeenCalled();
  });

  it("returns expected business failures in the shared server error shape", async () => {
    const action = actionClient
      .metadata({ operation: "feedback.vote" })
      .inputSchema(inputSchema)
      .action(async () => {
        throw businessError("UNAUTHENTICATED");
      });

    const result = await action({ title: "valid" });

    expect(result.serverError).toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Your session has expired. Sign in and try again.",
      requestId: expect.any(String),
    });
  });

  it("maps a known database race using operation and constraint", async () => {
    const action = actionClient
      .metadata({ operation: "project.update" })
      .inputSchema(inputSchema)
      .action(async () => {
        throw Object.assign(new Error("query failed"), {
          cause: {
            code: PostgresError.UNIQUE_VIOLATION,
            constraint: "projects_slug_unique",
          },
        });
      });

    const result = await action({ title: "valid" });

    expect(result.serverError).toMatchObject({
      code: "PROJECT_SLUG_TAKEN",
      field: "slug",
      message: "This public URL slug is already in use.",
      requestId: expect.any(String),
    });
  });

  it("sanitizes unknown failures and never logs SQL or parameters", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const action = actionClient
      .metadata({ operation: "feedback.create" })
      .inputSchema(inputSchema)
      .action(async () => {
        throw Object.assign(new Error("secret connection details"), {
          params: ["private feedback text"],
          query: "insert into feedback values ($1)",
        });
      });

    const result = await action({ title: "valid" });
    const serializedLog = JSON.stringify(log.mock.calls);

    expect(result.serverError).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Unable to submit feedback. Try again.",
      requestId: expect.any(String),
    });
    expect(serializedLog).not.toContain("secret connection details");
    expect(serializedLog).not.toContain("private feedback text");
    expect(serializedLog).not.toContain("insert into feedback");
    log.mockRestore();
  });

  it("rethrows Next.js navigation signals", async () => {
    const navigationError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/dashboard;307;",
    });
    const action = actionClient
      .metadata({ operation: "project.create" })
      .inputSchema(inputSchema)
      .action(async () => {
        throw navigationError;
      });

    await expect(action({ title: "valid" })).rejects.toBe(navigationError);
  });
});
