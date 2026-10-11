import { getI18n } from "@/lib/i18n/server";
import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSafeReturnTo } from "@/features/auth/safe-return-to";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
  title: t("Sign in | FeedbackFlow"),
  description: t("Sign in to manage your FeedbackFlow workspace."),
};
}

type LoginPageProps = {
  searchParams?: Promise<{ returnTo?: string | string[] }>;
};

// 读取并安全规范化 returnTo 参数，再交给登录表单用于成功后的站内跳转。
export default async function LoginPage({ searchParams }: LoginPageProps = {}) {
  const { locale } = await getI18n();
  const params = searchParams ? await searchParams : undefined;

  return (
    <AuthShell locale={locale} proof="login">
      <LoginForm returnTo={getSafeReturnTo(params?.returnTo)} />
    </AuthShell>
  );
}
