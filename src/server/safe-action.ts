import { createSafeActionClient, isNavigationError } from "next-safe-action";
import { z } from "zod";

import {
  BusinessError,
  ERROR_CATALOG,
  isBusinessError,
  type AppServerError,
} from "@/lib/errors";
import {
  actionOperations,
  mapDatabaseError,
  type ActionOperation,
} from "@/server/errors/database";

const actionMetadataSchema = z.object({
  operation: z.enum(actionOperations),
});

const operationFailureMessages: Record<ActionOperation, string> = {
  "feedback.create": "Unable to submit feedback. Try again.",
  "feedback.status.update": "Unable to update feedback. Try again.",
  "feedback.vote": "Unable to update your vote. Try again.",
  "project.create": "Unable to create your workspace. Try again.",
  "project.update": "Settings could not be saved. Please try again.",
  "billing.checkout": "Unable to start checkout. Refresh billing status before trying again.",
  "billing.portal": "Unable to open billing management. Please try again.",
  "billing.status": "Unable to read billing status. Please try again.",
  "billing.reconcile": "Unable to refresh billing status. Please try again shortly.",
};

/** 输出已知业务错误或数据库映射结果；未知异常生成安全提示与关联标识，并记录脱敏日志。 */
export function normalizeActionError(
  error: Error,
  operation?: ActionOperation,
): AppServerError {
  if (isBusinessError(error)) return error.toPayload();

  const mapped = operation ? mapDatabaseError(error, operation) : {};
  if (mapped.businessError) return mapped.businessError.toPayload();

  const internalError = new BusinessError("INTERNAL_ERROR", {
    message: operation
      ? operationFailureMessages[operation]
      : ERROR_CATALOG.INTERNAL_ERROR.message,
  });
  const safeConstraint = mapped.databaseError?.constraint?.match(
    /^[a-z0-9_]{1,128}$/i,
  )?.[0];

  console.error("Safe action failed", {
    code: internalError.code,
    ...(mapped.databaseError
      ? {
          ...(safeConstraint ? { constraint: safeConstraint } : {}),
          postgresCode: mapped.databaseError.code,
        }
      : {}),
    operation: operation ?? "unknown",
    requestId: internalError.requestId,
  });

  return internalError.toPayload();
}

/** 统一 Action 的输入校验格式、操作元信息和异常出口，供所有业务写入复用。 */
export const actionClient = createSafeActionClient({
  defaultValidationErrorsShape: "flattened",
  defineMetadataSchema: () => actionMetadataSchema,
  // 放行 Next.js 跳转等导航信号，只将真正的执行异常转换成业务响应。
  handleServerError: (error, { metadata }) => {
    if (isNavigationError(error)) throw error;
    const operation = actionOperations.includes(metadata?.operation)
      ? metadata.operation
      : undefined;
    return normalizeActionError(error, operation);
  },
});
