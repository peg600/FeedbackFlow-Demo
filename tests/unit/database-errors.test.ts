import { PostgresError } from "pg-error-enum";
import { describe, expect, it } from "vitest";

import {
  extractDatabaseError,
  mapDatabaseError,
} from "@/server/errors/database";

describe("database error mapping", () => {
  it("unwraps Drizzle causes and ignores unrelated wrapper codes", () => {
    const error = {
      code: "ERR_QUERY",
      cause: {
        code: PostgresError.UNIQUE_VIOLATION,
        constraint: "projects_slug_unique",
      },
    };

    expect(extractDatabaseError(error)).toEqual({
      code: PostgresError.UNIQUE_VIOLATION,
      constraint: "projects_slug_unique",
    });
  });

  it("maps only the exact operation and constraint", () => {
    const error = {
      cause: {
        code: PostgresError.UNIQUE_VIOLATION,
        constraint: "projects_slug_unique",
      },
    };

    expect(mapDatabaseError(error, "project.update").businessError).toMatchObject({
      code: "PROJECT_SLUG_TAKEN",
      field: "slug",
    });
    expect(mapDatabaseError(error, "project.create").businessError).toBeUndefined();
  });

  it("does not classify a PostgreSQL category without a known constraint", () => {
    const error = {
      code: PostgresError.FOREIGN_KEY_VIOLATION,
      constraint: "unrelated_internal_fk",
    };

    expect(mapDatabaseError(error, "feedback.create")).toEqual({
      databaseError: {
        code: PostgresError.FOREIGN_KEY_VIOLATION,
        constraint: "unrelated_internal_fk",
      },
    });
  });
});
