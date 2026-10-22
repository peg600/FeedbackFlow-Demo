import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createTranslator, type Locale } from "@/lib/i18n/shared";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const demoDescription = "A live demo board for collecting product feedback and sharing a public roadmap.";

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

/** 在站点 Header 下展示内容区内的项目概览与局部导航，窄屏允许名称和操作自然换行。 */
export function PublicProjectHeader({
  project,
  showSubmitFeedback = true,
  active = "feedback",
  locale = "en",
}: PublicProjectHeaderProps) {
  const t = createTranslator(locale);
  const boardHref = `/p/${project.slug}`;
  // 仅翻译演示项目的预置说明；用户修改后的描述仍按原文展示。
  const description = project.slug === "demo" && project.description === demoDescription
    ? t(demoDescription)
    : project.description;

  return (
    <>
      <SiteHeader locale={locale} navigation={[{ href: "/dashboard", label: "Dashboard" }]} />
      <section aria-label={t("Public project navigation")} className="mx-auto w-full max-w-content px-5 pt-7 md:px-8 md:pt-10 xl:px-12">
        <Link className="flex w-fit min-w-0 max-w-full items-start gap-3 md:gap-4" href={boardHref}>
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-token bg-primary text-base font-bold text-primary-foreground md:size-14"
          >
            {getInitials(project.name)}
          </span>
          <span className="min-w-0 max-w-2xl">
            <span className="block break-words text-heading-sm leading-snug font-bold text-foreground">
              {project.name}
            </span>
            <span className="mt-1 block break-words text-sm leading-6 text-muted-foreground">
              {description || t("Help us build a better product")}
            </span>
          </span>
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <nav
            aria-label={t("Public project navigation")}
            className="inline-flex max-w-full flex-wrap gap-8 text-sm font-medium md:gap-10"
          >
            <Link
              aria-current={active === "feedback" ? "page" : undefined}
              className={cn(
                "border-b-2 py-3",
                active === "feedback"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              href={boardHref}
            >
              {t("Feedback")}
            </Link>
            <Link
              aria-current={active === "roadmap" ? "page" : undefined}
              className={cn(
                "border-b-2 py-3",
                active === "roadmap"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              href={`${boardHref}/roadmap`}
            >
              {t("Roadmap")}
            </Link>
          </nav>

          {/* 原生锚点导航避免客户端路由缓存重复拼接 fragment。 */}
          {showSubmitFeedback ? (
            <a
              className={cn(buttonVariants({ variant: "secondary" }), "px-4 text-sm sm:ml-auto")}
              href={`${boardHref}#submit-feedback`}
            >
              <span className="md:hidden">{t("Submit")}</span>
              <span className="hidden md:inline">{t("Submit feedback")}</span>
            </a>
          ) : null}
        </div>
      </section>
    </>
  );
}
