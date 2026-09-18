const blockedAuthPaths = new Set(["/login", "/register"]);

// 只允许登录后跳回项目内部的明确业务页面，避免开放重定向和认证页面循环跳转。
function isAllowedReturnPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/p/")
  );
}

// 解析并规范化 returnTo 参数；任何外部地址、异常字符或不在白名单内的路径都会退回安全默认页。
export function getSafeReturnTo(
  value: string | string[] | undefined,
  fallback = "/dashboard",
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, "https://feedbackflow.local");
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";

    if (
      url.origin !== "https://feedbackflow.local" ||
      url.pathname.startsWith("//") ||
      blockedAuthPaths.has(normalizedPath) ||
      !isAllowedReturnPath(normalizedPath)
    ) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
