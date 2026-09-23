import { z } from "zod";

const paddleConfigSchema = z.object({
  apiKey: z.string().startsWith("pdl_sdbx_apikey_"),
  webhookSecret: z.string().min(16),
  priceId: z.string().regex(/^pri_[a-z0-9]{26}$/),
  clientToken: z.string().startsWith("test_"),
});

/** 延迟校验支付配置，公开浏览无需支付凭据；不完整或 Live 配置会关闭所有支付入口。 */
export function readPaddleConfig(environment: Record<string, string | undefined> = process.env) {
  const result = paddleConfigSchema.safeParse({
    apiKey: environment.PADDLE_API_KEY,
    webhookSecret: environment.PADDLE_NOTIFICATION_WEBHOOK_SECRET,
    priceId: environment.PADDLE_PRICE_ID_PRO,
    clientToken: environment.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  });
  return result.success ? result.data : null;
}
