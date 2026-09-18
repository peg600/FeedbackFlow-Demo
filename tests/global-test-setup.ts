import { assertTestDatabaseIdentity } from "./helpers/assert-test-database";

/** 仅执行隔离证明的只读检查；失败时测试框架不得进入任何写入用例。 */
export default async function setup() {
  await assertTestDatabaseIdentity();
}
