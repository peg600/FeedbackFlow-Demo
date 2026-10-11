"use client";

import Link from "next/link";
import { useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/client";

/** 会话仅决定首页的账户入口；等待或读取失败不推断为未登录，也不阻塞公开首页内容。 */
export function HomeHeader() {
  const { locale, t } = useI18n();
  const { data: session, isPending, isRefetching, error, refetch } = authClient.useSession();
  const [retryFailed, setRetryFailed] = useState(false);

  // 重试仅刷新官方会话查询；异常始终转为本地安全提示，不向界面暴露提供方细节。
  async function retrySession() {
    setRetryFailed(false);
    try {
      await refetch();
    } catch {
      setRetryFailed(true);
    }
  }

  let accountControl;
  if (session) {
    accountControl = <SignOutButton compact />;
  } else if (isPending) {
    accountControl = <span aria-label={t("Loading account")} role="status" className="h-8 w-20 animate-pulse rounded-placeholder bg-surface-hover" />;
  } else if (error || retryFailed) {
    accountControl = (
      <div className="flex min-w-0 max-w-40 flex-col items-end gap-1 text-right">
        <Button disabled={isRefetching} onClick={() => void retrySession()} size="small" variant="secondary">{t("Try again")}</Button>
        <p className="text-xs text-error" role="alert">{t("Account status unavailable.")}</p>
      </div>
    );
  } else {
    accountControl = <Link className={buttonVariants({ size: "small", variant: "secondary" })} href="/login">{t("Sign in")}</Link>;
  }

  return (
    <SiteHeader
      locale={locale}
      navigation={[{ href: "/dashboard", label: "Dashboard" }]}
      action={!session && !isPending && !error && !retryFailed ? (
        <Link className={buttonVariants({ size: "small" })} href="/register">{t("Create your board")}</Link>
      ) : undefined}
      trailingAction={accountControl}
    />
  );
}
