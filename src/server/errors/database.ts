import { PostgresError } from "pg-error-enum";

import { businessError, type BusinessError } from "@/lib/errors";

export const actionOperations = [
  "feedback.create",
  "feedback.status.update",
  "feedback.vote",
  "project.create",
  "project.update",
] as const;

export type ActionOperation = (typeof actionOperations)[number];

export type DatabaseErrorDetails = {
  code: string;
  constraint?: string;
};

type DatabaseErrorRule = DatabaseErrorDetails & {
  operation: ActionOperation;
  toBusinessError: () => BusinessError;
};

const databaseErrorRules: readonly DatabaseErrorRule[] = [
  {
    code: PostgresError.FOREIGN_KEY_VIOLATION,
    constraint: "projects_user_id_user_id_fk",
    operation: "project.create",
    toBusinessError: () => businessError("UNAUTHENTICATED"),
  },
  {
    code: PostgresError.UNIQUE_VIOLATION,
    constraint: "projects_slug_unique",
    operation: "project.update",
    toBusinessError: () => businessError("PROJECT_SLUG_TAKEN"),
  },
  {
    code: PostgresError.FOREIGN_KEY_VIOLATION,
    constraint: "feedback_project_id_projects_id_fk",
    operation: "feedback.create",
    toBusinessError: () => businessError("PUBLIC_BOARD_UNAVAILABLE"),
  },
  {
    code: PostgresError.FOREIGN_KEY_VIOLATION,
    constraint: "feedback_user_id_user_id_fk",
    operation: "feedback.create",
    toBusinessError: () => businessError("UNAUTHENTICATED"),
  },
  {
    code: PostgresError.FOREIGN_KEY_VIOLATION,
    constraint: "votes_feedback_id_feedback_id_fk",
    operation: "feedback.vote",
    toBusinessError: () => businessError("FEEDBACK_NOT_AVAILABLE"),
  },
  {
    code: PostgresError.FOREIGN_KEY_VIOLATION,
    constraint: "votes_user_id_user_id_fk",
    operation: "feedback.vote",
    toBusinessError: () => businessError("UNAUTHENTICATED"),
  },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

/** 沿 Drizzle 的 cause 链有限层数提取 SQLSTATE 与约束名，避免异常循环引用导致死循环。 */
export function extractDatabaseError(
  error: unknown,
): DatabaseErrorDetails | null {
  let current: unknown = error;

  // Drizzle wraps driver errors in `cause`. Keep the traversal deliberately
  // shallow so malformed error graphs cannot loop forever.
  for (let depth = 0; depth < 4; depth += 1) {
    const record = asRecord(current);
    if (!record) return null;

    if (
      typeof record.code === "string" &&
      /^[0-9A-Z]{5}$/.test(record.code)
    ) {
      return {
        code: record.code,
        ...(typeof record.constraint === "string"
          ? { constraint: record.constraint }
          : {}),
      };
    }

    current = record.cause;
  }

  return null;
}

/** 按业务操作、SQLSTATE 和精确约束名匹配业务错误，未命中的数据库异常保留为未知失败。 */
export function mapDatabaseError(
  error: unknown,
  operation: ActionOperation,
): { businessError?: BusinessError; databaseError?: DatabaseErrorDetails } {
  const databaseError = extractDatabaseError(error);
  if (!databaseError) return {};

  const rule = databaseErrorRules.find(
    (candidate) =>
      candidate.operation === operation &&
      candidate.code === databaseError.code &&
      candidate.constraint === databaseError.constraint,
  );

  return {
    ...(rule ? { businessError: rule.toBusinessError() } : {}),
    databaseError,
  };
}
