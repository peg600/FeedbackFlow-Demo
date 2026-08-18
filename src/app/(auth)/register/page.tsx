import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create account | FeedbackFlow",
  description: "Create your FeedbackFlow owner account.",
};

export default function RegisterPage() {
  return (
    <AuthShell proof="register">
      <RegisterForm />
    </AuthShell>
  );
}
