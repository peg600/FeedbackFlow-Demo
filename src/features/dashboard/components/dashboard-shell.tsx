"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useI18n } from "@/lib/i18n/client";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/settings", label: "Project settings" },
  { href: "/dashboard/billing", label: "Billing" },
] as const;

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type DashboardShellProps = {
  children: ReactNode;
  project: { name: string; slug: string };
  user: { email: string; name: string };
  plan?: "Free" | "Pro";
};

// 以共享站点 Header 提供全局入口；桌面保留工作空间侧栏，移动端业务入口交给同一个导航菜单。
export function DashboardShell({ children, project, user, plan = "Free" }: DashboardShellProps) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const publicLinks = [
    { href: `/p/${project.slug}`, label: "Feedback" },
    { href: `/p/${project.slug}/roadmap`, label: "Roadmap" },
  ];

  return (
    <div className="flex min-h-svh flex-col bg-surface">
      <SiteHeader
        layout="workspace"
        locale={locale}
        navigation={publicLinks}
        mobileNavigation={[
          ...navItems.map((item) => ({ ...item, active: pathname === item.href })),
          ...publicLinks,
        ]}
        action={<SignOutButton compact />}
      />

      <div className="flex min-w-0 flex-1">
        <aside className="hidden w-sidebar shrink-0 flex-col justify-between gap-8 border-r border-border bg-background p-5 lg:flex">
          <div className="flex flex-col gap-6">
            <section aria-label={t("Current workspace")} className="flex flex-col gap-1.5">
              <p className="text-caption font-bold tracking-wide text-muted-foreground">{t("WORKSPACE")}</p>
              <div className="flex min-w-0 items-center gap-2 rounded-placeholder bg-surface p-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-brand text-[10px] font-bold text-primary">
                  {initials(project.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{project.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{t("{plan} plan", { plan: t(plan) })}</span>
                </span>
              </div>
            </section>

            <nav aria-label={t("Dashboard navigation")} className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="ui-sidebar-item px-3 py-2 text-[13px] font-semibold"
                  href={item.href}
                  key={item.href}
                >
                  {t(item.label)}
                </Link>
              ))}
            </nav>

            <section className="flex flex-col gap-3 pt-3 text-[11px] font-semibold text-text">
              <p className="text-caption font-bold tracking-wide text-muted-foreground">{t("PUBLIC PROJECT")}</p>
              <Link href={`/p/${project.slug}`} target="_blank">{t("View feedback board ↗")}</Link>
              <Link href={`/p/${project.slug}/roadmap`} target="_blank">{t("View roadmap ↗")}</Link>
            </section>
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-placeholder bg-surface p-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-success text-[10px] font-bold text-success">
              {initials(user.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">{user.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{user.email}</span>
            </span>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
