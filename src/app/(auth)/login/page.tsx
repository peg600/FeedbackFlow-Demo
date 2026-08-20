import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSafeReturnTo } from "@/features/auth/safe-return-to";

export const metadata: Metadata = {
  title: "Sign in | FeedbackFlow",
  description: "Sign in to manage your FeedbackFlow workspace.",
};

type LoginPageProps = {
  searchParams?: Promise<{ returnTo?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps = {}) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <AuthShell proof="login">
      <LoginForm returnTo={getSafeReturnTo(params?.returnTo)} />
    </AuthShell>
  );
}
