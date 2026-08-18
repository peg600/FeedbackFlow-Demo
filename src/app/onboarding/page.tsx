import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-content flex-col gap-3 px-5 py-10 md:px-8">
      <p className="text-body-sm font-semibold text-primary">Welcome</p>
      <h1 className="text-heading-lg font-bold text-foreground">
        Set up your FeedbackFlow project
      </h1>
      <p className="max-w-2xl text-body text-muted-foreground">
        Your account for {session.user.email} is ready. Project setup comes in
        the next implementation stage.
      </p>
    </main>
  );
}
