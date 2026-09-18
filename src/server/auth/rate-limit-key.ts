const endpointClasses = new Set(["/sign-in/email", "/sign-up/email"]);

/** 将认证 catch-all 中任意路径归入有限桶，防止随机 URL 绕过限流并无限创建数据库记录。 */
export function getAuthRateLimitKey(key: string, rule: { window: number; max: number }) {
  const separator = key.lastIndexOf("|");
  const identity = separator < 0 ? "no-trusted-ip" : key.slice(0, separator);
  const path = separator < 0 ? "" : key.slice(separator + 1);
  // 保留 Better Auth 的特殊端点规则，且不同窗口/额度不得共享同一条过期记录。
  return `auth:${identity}|${endpointClasses.has(path) ? path : "/other"}:${rule.window}:${rule.max}`;
}
