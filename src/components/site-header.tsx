import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { HeaderMenu } from "@/components/header-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { createTranslator, type Locale } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

export type HeaderLink = { href: string; label: string; active?: boolean };

type SiteHeaderProps = {
  locale?: Locale;
  navigation?: readonly HeaderLink[];
  mobileNavigation?: readonly HeaderLink[];
  action?: ReactNode;
  trailingAction?: ReactNode;
  profileActive?: boolean;
  layout?: "centered" | "workspace";
};

/** 共用站点入口和交互；公开页内容居中，工作空间按侧栏宽度分栏对齐，不读取会话或领域数据。 */
export function SiteHeader({
  locale = "en",
  navigation = [],
  mobileNavigation = navigation,
  action,
  trailingAction,
  profileActive = false,
  layout = "centered",
}: SiteHeaderProps) {
  const t = createTranslator(locale);
  const profile = { href: "/profile", label: "About the maker", active: profileActive };

  return (
    <header className="shrink-0 border-b border-border bg-background">
      <div className={cn(
        "mx-auto flex min-h-18 max-w-content flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8",
        layout === "workspace" && "mx-0 w-full max-w-none md:px-6 lg:grid lg:grid-cols-[var(--layout-sidebar-width)_minmax(0,1fr)] lg:gap-0 lg:p-0",
      )}>
        <Link aria-label={t("FeedbackFlow home")} className={cn(
          "shrink-0 rounded-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-outline",
          layout === "workspace" && "lg:flex lg:h-full lg:items-center lg:rounded-none lg:px-5 lg:py-3",
        )} href="/">
          <Brand />
        </Link>

        <div className={cn(
          "ml-auto flex min-w-0 items-center gap-8",
          layout === "workspace" && "lg:ml-0 lg:justify-end lg:px-8 lg:py-3",
        )}>
          <LanguageSwitcher />
          <nav aria-label={t("Primary navigation")} className="hidden flex-wrap items-center justify-end gap-x-9 gap-y-4 xl:flex">
            {[...navigation, profile].map((item) => (
              <Link
                aria-current={item.active ? "page" : undefined}
                className={cn("rounded-placeholder text-sm font-medium text-subtle-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-outline", item.active && "text-primary")}
                href={item.href}
                key={item.href}
              >
                {t(item.label)}
              </Link>
            ))}
            {action}
          </nav>

          <HeaderMenu label={t("Open navigation")}>
            <nav
              aria-label={t("Mobile navigation")}
              className="absolute top-full right-0 z-30 mt-3 flex w-64 max-w-[calc(100vw-2.5rem)] flex-col gap-1 rounded-surface border border-border bg-background p-3 shadow-lg"
            >
              {[...mobileNavigation, profile].map((item) => (
                <Link
                  aria-current={item.active ? "page" : undefined}
                  className={cn("rounded-placeholder px-4 py-3 text-sm font-medium text-text hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-outline", item.active && "bg-surface-brand text-primary")}
                  href={item.href}
                  key={item.href}
                >
                  {t(item.label)}
                </Link>
              ))}
              {action ? <div className="mt-2 px-4 pb-2">{action}</div> : null}
            </nav>
          </HeaderMenu>
          {trailingAction}
        </div>
      </div>
    </header>
  );
}
