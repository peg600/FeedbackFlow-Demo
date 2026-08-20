const blockedAuthPaths = new Set(["/login", "/register"]);

function isAllowedReturnPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/p/")
  );
}

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
