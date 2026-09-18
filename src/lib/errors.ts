export const ERROR_CATALOG = {
  BILLING_NOT_IMPLEMENTED: {
    message: "Billing is not available yet.",
  },
  FEEDBACK_LIMIT_REACHED: {
    message: "This public board has reached its 50 feedback limit.",
  },
  FEEDBACK_NOT_AVAILABLE: {
    message: "This feedback is unavailable.",
  },
  INTERNAL_ERROR: {
    message: "Something went wrong. Please try again.",
  },
  PROJECT_NOT_FOUND: {
    message: "Project not found.",
  },
  PROJECT_SLUG_TAKEN: {
    field: "slug",
    message: "This public URL slug is already in use.",
  },
  PUBLIC_BOARD_UNAVAILABLE: {
    message: "This public board is unavailable.",
  },
  UNAUTHENTICATED: {
    message: "Your session has expired. Sign in and try again.",
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export type AppServerError = {
  code: ErrorCode;
  field?: string;
  message: string;
  requestId: string;
};

type BusinessErrorOptions = {
  field?: string;
  message?: string;
  requestId?: string;
};

/** 携带稳定业务错误码和可公开文案，供服务层抛出、Action 边界序列化。 */
export class BusinessError extends Error {
  readonly code: ErrorCode;
  readonly field?: string;
  readonly requestId: string;

  /** 从错误目录加载默认字段与文案，并为本次错误生成关联标识。 */
  constructor(code: ErrorCode, options: BusinessErrorOptions = {}) {
    const definition = ERROR_CATALOG[code];
    super(options.message ?? definition.message);
    this.name = "BusinessError";
    this.code = code;
    this.field = options.field ?? ("field" in definition ? definition.field : undefined);
    this.requestId = options.requestId ?? crypto.randomUUID();
  }

  /** 只输出允许交给客户端的错误信息，排除堆栈等 Error 内部属性。 */
  toPayload(): AppServerError {
    return {
      code: this.code,
      ...(this.field ? { field: this.field } : {}),
      message: this.message,
      requestId: this.requestId,
    };
  }
}

export function businessError(
  code: ErrorCode,
  options?: BusinessErrorOptions,
) {
  return new BusinessError(code, options);
}

export function isBusinessError(error: unknown): error is BusinessError {
  return error instanceof BusinessError;
}
