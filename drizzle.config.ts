import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

const localEnvPath = resolve(process.cwd(), ".env.local");

if (!process.env.DATABASE_URL_UNPOOLED && existsSync(localEnvPath)) {
  process.loadEnvFile(localEnvPath);
}

const migrationUrl = process.env.DATABASE_URL_UNPOOLED;

if (!migrationUrl) {
  throw new Error("DATABASE_URL_UNPOOLED is required for Drizzle commands.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: migrationUrl,
  },
});
