import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";

import { businessError } from "@/lib/errors";
import { readPaddleConfig } from "@/features/billing/server/config";

/** 显式锁定 Sandbox，关闭上游日志，避免错误对象包含账务资料或请求参数。 */
export function getPaddle() {
  const config = readPaddleConfig();
  if (!config) throw businessError("BILLING_NOT_CONFIGURED");
  return new Paddle(config.apiKey, { environment: Environment.sandbox, logLevel: LogLevel.none });
}
