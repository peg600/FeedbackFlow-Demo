import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

import { readTestDatabaseEnvironment } from "../tests/helpers/test-database";
import { assertTestDatabaseIdentity } from "../tests/helpers/assert-test-database";

/** 只将已审核的 Drizzle migration 应用于显式白名单的 Neon 测试 endpoint，绝不回退到普通环境变量。 */
export async function migrateTestDatabase() {
  await assertTestDatabaseIdentity();
  const environment = readTestDatabaseEnvironment();
  const database = drizzle(environment.databaseUrlUnpooled);
  try {
    await migrate(database, { migrationsFolder: "./drizzle" });
  } finally {
    await database.$client.end();
  }
}
