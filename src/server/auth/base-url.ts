import type { BetterAuthOptions } from "better-auth";

type AuthBaseURL = NonNullable<BetterAuthOptions["baseURL"]>;

type AuthBaseURLInput = {
  configuredURL: string;
  vercelEnvironment?: string;
  vercelURL?: string;
  vercelBranchURL?: string;
};

/** 将配置中的域名或完整 URL 解析为主机名和端口，忽略缺失或无法解析的值。 */
function getHost(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = value.includes("://") ? value : `https://${value}`;
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/** 非 Vercel Preview/Production 环境使用固定认证地址；这两种部署模式仅允许配置中的精确 HTTPS 主机。 */
export function createAuthBaseURL({
  configuredURL,
  vercelEnvironment = process.env.VERCEL_ENV,
  vercelURL = process.env.VERCEL_URL,
  vercelBranchURL = process.env.VERCEL_BRANCH_URL,
}: AuthBaseURLInput): AuthBaseURL {
  const isVercelDeployment =
    vercelEnvironment === "preview" || vercelEnvironment === "production";

  if (!isVercelDeployment) {
    return configuredURL;
  }

  const allowedHosts = [
    getHost(configuredURL),
    getHost(vercelURL),
    getHost(vercelBranchURL),
  ].filter((host): host is string => Boolean(host));

  return {
    allowedHosts: [...new Set(allowedHosts)],
    protocol: "https",
  };
}
