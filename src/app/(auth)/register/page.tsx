import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create account | FeedbackFlow",
  description: "Create your FeedbackFlow owner account.",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-svh items-start justify-center bg-surface px-5 py-8 md:py-16">
      <section className="w-full min-w-0 max-w-[520px] rounded-surface border border-border bg-background p-6 shadow-[0_8px_12px_rgb(16_24_40/3%)] md:p-12">
        <RegisterForm />
      </section>
    </main>
  );
}
