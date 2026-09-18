import { PostgresError } from "pg-error-enum";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { businessError } from "@/lib/errors";
import { actionClient } from "@/server/safe-action";

const inputSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
});

describe("actionClient", () => {
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
