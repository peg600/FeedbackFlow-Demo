type ActionErrorResult = {
  serverError?: { message: string; field?: string };
  validationErrors?: {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
};

export const ACTION_NETWORK_ERROR =
  "Unable to reach the server. Check your connection and try again.";

/** 优先提取字段校验错误，再读取绑定该字段的业务错误，供输入框旁统一展示。 */
export function getActionFieldError(
  result: ActionErrorResult | undefined,
  field: string,
) {
  return (
    result?.validationErrors?.fieldErrors[field]?.[0] ??
    (result?.serverError?.field === field
      ? result.serverError.message
      : undefined)
  );
}

/** 按业务错误、表单级校验错误、通用校验提示的顺序选择文案，不负责触发通知组件。 */
export function getActionErrorMessage(
  result: ActionErrorResult | undefined,
  validationMessage = "Check the highlighted fields and try again.",
) {
  return (
    result?.serverError?.message ??
    result?.validationErrors?.formErrors[0] ??
    (result?.validationErrors ? validationMessage : undefined)
  );
}
