import { loginSchema } from "@/features/auth/schemas";

export type DemoLoginCredentials = Readonly<{ email: string; password: string }>;

const demoLoginSchema = loginSchema.pick({ email: true, password: true });

// 仅在明确允许公开演示凭据时返回白名单字段；可选配置无效不影响普通登录。
export function getDemoLoginCredentials(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): DemoLoginCredentials | undefined {
  if (environment.DEMO_LOGIN_ENABLED !== "true") return undefined;

  const result = demoLoginSchema.safeParse({
    email: environment.DEMO_USER_EMAIL?.trim().toLowerCase(),
    password: environment.DEMO_USER_PASSWORD,
  });
  if (!result.success) return undefined;

  return { email: result.data.email, password: result.data.password };
}
