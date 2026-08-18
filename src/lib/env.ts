import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.url("DATABASE_URL must be a valid URL."),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL."),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
});

const isVercelPreview = process.env.VERCEL_ENV === "preview";
const vercelDeploymentUrl = process.env.VERCEL_URL?.trim();
const betterAuthUrl =
  process.env.BETTER_AUTH_URL?.trim() ||
  (isVercelPreview && vercelDeploymentUrl
    ? `https://${vercelDeploymentUrl}`
    : undefined);

const parsedEnv = serverEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_URL: betterAuthUrl,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
});

if (!parsedEnv.success) {
  const variableNames = parsedEnv.error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .join(", ");

  throw new Error(`Invalid server environment variables: ${variableNames}`);
}

const authUrl = new URL(parsedEnv.data.BETTER_AUTH_URL);
const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
  authUrl.hostname,
);

if (
  parsedEnv.data.NODE_ENV === "production" &&
  !isLoopback &&
  authUrl.protocol !== "https:"
) {
  throw new Error("Invalid server environment variables: BETTER_AUTH_URL");
}

export const env = parsedEnv.data;
