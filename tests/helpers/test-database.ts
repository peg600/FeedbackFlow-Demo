import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "../../src/server/db/schema";

type Environment = Record<string, string | undefined>;

export type TestDatabaseEnvironment = {
  databaseUrl: string;
  databaseUrlUnpooled: string;
  normalizedHost: string;
};

/**
 * 只接受显式指定且已核对 Neon endpoint 的测试连接；绝不以开发连接作为测试写入的后备。
 * pooled 与 direct endpoint 会归一化后比较，避免同一 Neon 分支因连接形式不同而误判。
 */
export function readTestDatabaseEnvironment(
  environment: Environment = process.env,
  configuredDatabaseUrls: string[] = readConfiguredDatabaseUrls(),
): TestDatabaseEnvironment {
  const databaseUrl = required(environment, "TEST_DATABASE_URL");
  const databaseUrlUnpooled = required(
    environment,
    "TEST_DATABASE_URL_UNPOOLED",
  );
  const expectedHost = required(environment, "TEST_DATABASE_EXPECTED_HOST");
  const pooledHost = readNeonHost(databaseUrl, "TEST_DATABASE_URL");
  const directHost = readNeonHost(
    databaseUrlUnpooled,
    "TEST_DATABASE_URL_UNPOOLED",
  );
  const normalizedExpectedHost = normalizeNeonHost(expectedHost);

  if (new URL(databaseUrlUnpooled).hostname.includes("-pooler.")) {
    throw new Error("TEST_DATABASE_URL_UNPOOLED must use a direct endpoint.");
  }
  if (new URL(databaseUrl).pathname !== new URL(databaseUrlUnpooled).pathname) {
    throw new Error("Pooled and direct test URLs must select the same database.");
  }

  if (pooledHost !== directHost || pooledHost !== normalizedExpectedHost) {
    throw new Error(
      "Test database endpoints must match TEST_DATABASE_EXPECTED_HOST.",
    );
  }

  const activeUrls = [environment.DATABASE_URL, environment.DATABASE_URL_UNPOOLED, ...configuredDatabaseUrls];
  for (const activeDatabaseUrl of activeUrls) {
    if (!activeDatabaseUrl?.trim()) continue;
    let activeHost: string;
    try {
      activeHost = normalizeNeonHost(new URL(activeDatabaseUrl).hostname);
    } catch {
      throw new Error("A configured application database URL is invalid; verify isolation before testing.");
    }
    if (activeHost === pooledHost) {
      throw new Error(
        "TEST_DATABASE_URL must not target the active DATABASE_URL or a configured application endpoint.",
      );
    }
  }

  return {
    databaseUrl,
    databaseUrlUnpooled,
    normalizedHost: pooledHost,
  };
}

/** 仅将本地开发/生产连接用于拒绝列表，绝不将它们加载到环境或用作测试连接后备。 */
function readConfiguredDatabaseUrls() {
  const urls: string[] = [];
  for (const filename of [".env", ".env.local", ".env.development", ".env.development.local", ".env.production", ".env.production.local"]) {
    const path = resolve(process.cwd(), filename);
    if (!existsSync(path)) continue;
    const values = parseEnv(readFileSync(path, "utf8"));
    for (const key of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
      if (values[key]?.trim()) urls.push(values[key]);
    }
  }
  return urls;
}

/** 为集成测试创建独立客户端；调用方必须使用测试清理器删除本次创建的精确记录。 */
export function createTestDatabase(environment: Environment = process.env) {
  const { databaseUrl } = readTestDatabaseEnvironment(environment);
  return drizzle(databaseUrl, { schema });
}

function required(environment: Environment, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required for database integration tests.`);
  return value;
}

function readNeonHost(urlValue: string, name: string) {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${name} must be a PostgreSQL URL.`);
  }
  const host = normalizeNeonHost(url.hostname);
  if (!host.endsWith(".neon.tech")) {
    throw new Error(`${name} must target a Neon endpoint.`);
  }
  if (/(^|[-.])(prod|production|dev|develop|development|main)([-.]|$)/i.test(host)) {
    throw new Error(`${name} must not target a dev or production endpoint alias.`);
  }
  return host;
}

/** Neon pooled endpoint 只是在 endpoint label 后附加 -pooler，比较时将其移除。 */
export function normalizeNeonHost(host: string) {
  return host.trim().toLowerCase().replace(/-pooler(?=\.)/, "");
}
