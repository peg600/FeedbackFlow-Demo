import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createTranslator, type Locale } from "@/lib/i18n/shared";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 提取项目名称前两个词的首字符作为头像缩写，空名称使用 FF 兜底。 */
function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "FF"
  );
}

type PublicProjectHeaderProps = {
  project: {
    description: string | null;
    name: string;
    slug: string;
  };
  showSubmitFeedback?: boolean;
  active?: "feedback" | "roadmap";
  locale?: Locale;
};

export function PublicProjectHeader({
  project,
  showSubmitFeedback = true,
  active = "feedback",
  locale = "en",
}: PublicProjectHeaderProps) {
  const t = createTranslator(locale);
  const boardHref = `/p/${project.slug}`;

  return (
    <>
      <SiteHeader locale={locale} navigation={[{ href: "/dashboard", label: "Dashboard" }]} />
      <section aria-label={t("Public project navigation")} className="border-b border-border bg-background">
      <div className="mx-auto w-full max-w-content px-5 md:px-8 xl:px-12">
        <div className="flex min-h-[68px] items-center justify-between gap-4 py-3 md:min-h-[82px]">
          <Link className="flex min-w-0 items-center gap-3" href={boardHref}>
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-brand text-sm font-bold text-primary"
            >
              {getInitials(project.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold text-foreground">
                {project.name}
              </span>
              <span className="hidden truncate text-[11px] text-muted-foreground md:block">
                {project.description || t("Help us build a better product")}
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-3 md:gap-8">
            <nav
              aria-label={t("Public project navigation")}
              className="hidden items-center gap-6 text-[13px] font-semibold md:flex"
            >
              <Link aria-current={active === "feedback" ? "page" : undefined} className={active === "feedback" ? "text-primary" : "text-text hover:text-foreground"} href={boardHref}>
                {t("Feedback")}
              </Link>
              <Link aria-current={active === "roadmap" ? "page" : undefined} className={active === "roadmap" ? "text-primary" : "text-text hover:text-foreground"} href={`${boardHref}/roadmap`}>
                {t("Roadmap")}
              </Link>
            </nav>

            {/* 原生锚点导航避免客户端路由缓存重复拼接 fragment。 */}
            {showSubmitFeedback ? (
              <a
                className={cn(buttonVariants(), "px-4 text-[13px]")}
                href={`${boardHref}#submit-feedback`}
              >
                <span className="md:hidden">{t("Submit")}</span>
                <span className="hidden md:inline">{t("Submit feedback")}</span>
              </a>
            ) : null}
          </div>
        </div>

        <nav
          aria-label={t("Public project mobile navigation")}
          className="grid grid-cols-2 border-t border-border text-center text-[13px] font-semibold md:hidden"
        >
          <Link
            aria-current={active === "feedback" ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-3",
              active === "feedback"
                ? "border-primary text-primary"
                : "border-transparent text-text",
            )}
            href={boardHref}
          >
            {t("Feedback")}
          </Link>
          <Link
            aria-current={active === "roadmap" ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-3",
              active === "roadmap"
                ? "border-primary text-primary"
                : "border-transparent text-text",
            )}
            href={`${boardHref}/roadmap`}
          >
            {t("Roadmap")}
          </Link>
        </nav>
      </div>
      </section>
    </>
  );
}
