import { getI18n } from "@/lib/i18n/server";
import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
  title: t("Create account | FeedbackFlow"),
  description: t("Create your FeedbackFlow owner account."),
};
}

export default async function RegisterPage() {
  const { locale } = await getI18n();
  return (
    <AuthShell locale={locale} proof="register">
      <RegisterForm />
    </AuthShell>
  );
}
