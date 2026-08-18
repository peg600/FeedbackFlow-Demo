import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in | FeedbackFlow",
  description: "Sign in to manage your FeedbackFlow workspace.",
};

export default function LoginPage() {
  return (
    <AuthShell proof="login">
      <LoginForm />
    </AuthShell>
  );
}
