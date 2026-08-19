import type { BetterAuthOptions } from "better-auth";

type AuthBaseURL = NonNullable<BetterAuthOptions["baseURL"]>;

type AuthBaseURLInput = {
  configuredURL: string;
  vercelEnvironment?: string;
  vercelURL?: string;
  vercelBranchURL?: string;
};

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
