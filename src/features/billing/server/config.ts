import { z } from "zod";

const paddleConfigSchema = z.object({
  apiKey: z.string().startsWith("pdl_sdbx_apikey_"),
  webhookSecret: z.string().min(16),
  priceId: z.string().regex(/^pri_[a-z0-9]{26}$/),
  clientToken: z.string().startsWith("test_"),
});

const configFields = {
  apiKey: { variable: "PADDLE_API_KEY", expected: "Sandbox API key starting with pdl_sdbx_apikey_" },
  webhookSecret: { variable: "PADDLE_NOTIFICATION_WEBHOOK_SECRET", expected: "Destination signing secret with at least 16 characters" },
  priceId: { variable: "PADDLE_PRICE_ID_PRO", expected: "pri_ followed by 26 lowercase letters or digits" },
  clientToken: { variable: "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", expected: "Sandbox client token starting with test_ (not its ctkn_ ID)" },
} as const;

type ConfigField = keyof typeof configFields;
let lastDiagnostic: { signature: string; loggedAt: number } | undefined;
const diagnosticIntervalMs = 60_000;

/** 将失败归类为固定原因，不把配置值或 Zod 原始错误放入日志。 */
function describeConfigFailure(field: ConfigField, value: string | undefined) {
  if (value === undefined || value.trim() === "") return "missing";
  if (value !== value.trim()) return "surrounding_whitespace";
  if (/^["']|["']$/.test(value)) return "surrounding_quotes";
  if ((field === "apiKey" && value.startsWith("pdl_live_apikey_")) ||
      (field === "clientToken" && value.startsWith("live_"))) return "live_credentials_not_allowed";
  if (field === "clientToken" && value.startsWith("ctkn_")) return "token_id_instead_of_token";
  return "invalid_format";
}

/** 每个服务端实例对相同诊断最多每分钟记录一次；仅保留白名单字段及固定说明。 */
function reportConfigFailure(fields: ConfigField[], environment: Record<string, string | undefined>) {
  const issues = fields.map((field) => ({
    ...configFields[field],
    reason: describeConfigFailure(field, environment[configFields[field].variable]),
  }));
  const signature = JSON.stringify(issues);
  const now = Date.now();
  if (lastDiagnostic?.signature === signature && now - lastDiagnostic.loggedAt < diagnosticIntervalMs) return;
  lastDiagnostic = { signature, loggedAt: now };
  console.error("Paddle configuration invalid", { code: "BILLING_NOT_CONFIGURED", issues });
}

/** 延迟校验支付配置，公开浏览无需支付凭据；不完整或 Live 配置会关闭所有支付入口。 */
export function readPaddleConfig(environment: Record<string, string | undefined> = process.env) {
  const result = paddleConfigSchema.safeParse({
    apiKey: environment.PADDLE_API_KEY,
    webhookSecret: environment.PADDLE_NOTIFICATION_WEBHOOK_SECRET,
    priceId: environment.PADDLE_PRICE_ID_PRO,
    clientToken: environment.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  });
  if (result.success) {
    lastDiagnostic = undefined;
    return result.data;
  }

  const invalidFields = new Set(result.error.issues.map((issue) => issue.path[0]));
  reportConfigFailure((Object.keys(configFields) as ConfigField[]).filter((field) => invalidFields.has(field)), environment);
  return null;
}
