import { ApiError } from "@paddle/paddle-node-sdk";

// 只输出已知提供方错误码，避免未来 SDK 把请求内容带入日志字段。
const paddleErrorCodes = new Set([
  "authentication_malformed", "authentication_missing", "invalid_token", "forbidden",
  "not_found", "invalid_field", "too_many_requests",
  "transaction_checkout_not_enabled", "transaction_checkout_url_domain_is_not_approved",
  "transaction_default_checkout_url_not_set", "transaction_creation_blocked",
  "transaction_price_not_found", "customer_email_invalid", "customer_email_domain_not_allowed",
]);

/** 仅提取 SDK 异常的固定分类；不记录 detail、嵌套 errors、URL 或原始异常。 */
export function getPaddleErrorDiagnostic(error: unknown) {
  if (!(error instanceof ApiError)) return undefined;
  return {
    code: paddleErrorCodes.has(error.code) ? error.code : "unknown_provider_error",
    type: error.type === "request_error" || error.type === "api_error" ? error.type : "unknown",
  };
}
