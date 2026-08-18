import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { auth } from "@/server/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-content flex-col gap-6 px-5 py-10 md:px-8">
      <div>
        <p className="text-body-sm text-muted-foreground">Signed in as</p>
        <h1 className="text-heading-lg font-bold text-foreground">
          {session.user.name}
        </h1>
        <p className="text-body-sm text-text">{session.user.email}</p>
      </div>
      <SignOutButton />
    </main>
  );
}
