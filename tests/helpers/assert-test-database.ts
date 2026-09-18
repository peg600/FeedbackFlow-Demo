import { createHash, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { readTestDatabaseEnvironment } from "./test-database";

/** 对比独立配置的随机标记；标记只在人工确认的测试分支初始化，不由应用 migration 创建。 */
export function matchesTestDatabaseGuard(token: string, storedHash: unknown) {
  if (token.length < 32 || typeof storedHash !== "string" || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  const expected = createHash("sha256").update(token).digest();
  return timingSafeEqual(expected, Buffer.from(storedHash, "hex"));
}

/** 在任何测试写入或迁移前核对库内专用标记；不存在、不可达、或不匹配都安全拒绝。 */
export async function assertTestDatabaseIdentity() {
  const environment = readTestDatabaseEnvironment();
  const token = process.env.TEST_DATABASE_GUARD_TOKEN ?? "";
  if (token.length < 32) throw new Error("TEST_DATABASE_GUARD_TOKEN must be at least 32 characters.");
  const database = drizzle(environment.databaseUrlUnpooled);
  try {
    const result = await database.execute<{ token_hash: string }>(sql`
      select token_hash from public.__feedbackflow_test_guard where id = 1
    `);
    if (!matchesTestDatabaseGuard(token, result.rows[0]?.token_hash)) {
      throw new Error("Test database guard mismatch.");
    }
  } catch {
    throw new Error("Test database identity could not be verified. Provision the guard on the confirmed test branch before running tests or migrations.");
  } finally {
    await database.$client.end();
  }
}
