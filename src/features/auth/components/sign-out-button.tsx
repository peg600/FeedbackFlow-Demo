"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getAuthError } from "@/features/auth/auth-error";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  compact?: boolean;
};

// 管理退出登录的并发保护、错误提示和成功后的路由刷新，确保服务端组件读取到最新会话。
export function SignOutButton({
  className,
  compact = false,
}: SignOutButtonProps = {}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pending 期间忽略重复点击，并把 Better Auth 或网络异常转换为统一的安全提示。
  async function handleSignOut() {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(getAuthError(result.error, "signOut").message);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError(getAuthError(undefined, "signOut").message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <Button
        disabled={isPending}
        onClick={handleSignOut}
        size={compact ? "small" : "default"}
        variant="secondary"
      >
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
