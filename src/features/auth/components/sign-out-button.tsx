"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(result.error.message ?? "Unable to sign out. Try again.");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button disabled={isPending} onClick={handleSignOut} variant="secondary">
        {isPending ? "Signing out..." : "Sign out"}
      </Button>
      {error ? (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
