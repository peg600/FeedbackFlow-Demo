"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/client";

type HomeActionLinkProps = {
  intent: "board" | "free" | "pro";
  className?: string;
};

const anonymousActions = {
  board: { href: "/register", label: "Create your board" },
  free: { href: "/register", label: "Start free" },
  pro: { href: "/login?returnTo=/dashboard/billing", label: "Try Pro in sandbox" },
} as const;

/** 首页业务入口复用官方会话状态；身份未知时进入受保护业务页，由服务端判定登录及项目引导。 */
export function HomeActionLink({ intent, className }: HomeActionLinkProps) {
  const { data: session, isPending, error } = authClient.useSession();
  const { t } = useI18n();
  const isAnonymous = !session && !isPending && !error;
  const protectedAction = session && intent === "pro"
    ? { href: "/dashboard/billing", label: "Billing" }
    : { href: "/dashboard", label: "Dashboard" };
  const { href, label } = isAnonymous ? anonymousActions[intent] : protectedAction;

  return <Link className={className} href={href}>{t(label)}</Link>;
}
