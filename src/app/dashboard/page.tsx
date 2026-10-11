import { formatRelativeTime } from "@/lib/i18n/time";
import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { FREE_FEEDBACK_LIMIT } from "@/features/billing/limits";
import { getBillingPlan } from "@/features/billing/server/billing";
import { DashboardFilters } from "@/features/dashboard/components/dashboard-filters";
import { StatusSelect } from "@/features/feedback/components/status-select";
import { cn } from "@/lib/utils";
import { getDashboardData } from "@/features/dashboard/server/queries";
import { requireDashboardAccess } from "@/features/projects/server/access";
import { parseDashboardSearchParams } from "@/features/dashboard/schemas";

type DashboardPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// 在分页链接中保留非默认筛选条件，确保控制台状态可刷新和分享。
function pageHref(params: ReturnType<typeof parseDashboardSearchParams>, page: number) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status !== "all") query.set("status", params.status);
  if (params.sort !== "newest") query.set("sort", params.sort);
  if (page > 1) query.set("page", String(page));
  return query.size ? `/dashboard?${query}` : "/dashboard";
}

// 完成控制台访问授权、查询参数规范化和项目级数据读取，再渲染指标、筛选及分页结果。
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { t, locale } = await getI18n();
  const { project, session } = await requireDashboardAccess();
  const params = parseDashboardSearchParams(await searchParams);
  const [data, plan] = await Promise.all([
    getDashboardData(project.id, params),
    getBillingPlan(session.user.id),
  ]);
  const { metrics, pagination } = data;
  const firstItem = pagination.filteredCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.filteredCount);
  const noResults = Boolean(params.search || params.status !== "all");
  const metricCards = [
    { label: "Total feedback", value: metrics.totalFeedback.toLocaleString(), detail: t("+{count} this month", { count: metrics.currentMonthFeedback }), mobile: true, tone: "text-success" },
    { label: "Awaiting review", value: metrics.awaitingReview.toLocaleString(), detail: "Needs attention", mobile: false, tone: "text-warning-foreground" },
    { label: "Total votes", value: metrics.totalVotes.toLocaleString(), detail: "Across all feedback", mobile: false, tone: "text-success" },
    { label: "Completed", value: metrics.completed.toLocaleString(), detail: t("{count}% of all", { count: metrics.completedPercentage }), mobile: true, tone: "text-primary" },
  ];

  return (
    <main className="min-h-[calc(100svh-72px)] bg-surface px-5 py-6 md:px-6 md:py-7 lg:min-h-svh lg:px-8 lg:py-0">
      <header className="mb-7 flex items-center justify-between gap-4 lg:-mx-8 lg:mb-6 lg:border-b lg:border-border lg:bg-background lg:px-8 lg:py-6">
        <div className="min-w-0"><h1 className="text-[26px] font-bold text-foreground md:text-2xl"><span className="md:hidden">{t("Dashboard")}</span><span className="hidden md:inline">{t("Overview")}</span></h1><p className="mt-1 text-[13px] text-muted-foreground md:text-sm">{t("Monitor feedback and move the roadmap forward.")}</p></div>
        <Link
          className={cn(
            buttonVariants(),
            "lg:border-border-subtle lg:bg-background lg:text-foreground lg:hover:bg-surface-subtle",
          )}
          href={`/p/${project.slug}`}
        >
          <span className="md:hidden">{t("View board")}</span>
          <span className="hidden md:inline">{t("View public board")}</span>
        </Link>
      </header>

      <section aria-label={t("Dashboard metrics")} className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {metricCards.map((metric) => <article className={`${metric.mobile ? "" : "hidden md:block"} ui-card p-4`} key={metric.label}><p className="text-[11px] text-muted-foreground">{t(metric.label)}</p><p className="mt-2 text-2xl font-bold text-foreground">{metric.value}</p><p className={`mt-2 text-[10px] ${metric.tone}`}>{t(metric.detail)}</p></article>)}
      </section>

      <section aria-labelledby="feedback-heading" className="ui-card mt-6 p-4 md:p-5">
        <h2 className="sr-only" id="feedback-heading">{t("Feedback")}</h2>
        <div className="mb-4 hidden items-center justify-between md:flex"><div className="flex items-center gap-3"><span aria-hidden="true" className="text-base font-bold">{t("Feedback")}</span><span className="rounded-pill bg-surface-warning px-2.5 py-1 text-[10px] font-bold text-warning-foreground">{plan === "Pro" ? t("{count} feedback · unlimited", { count: metrics.totalFeedback }) : t("{count} / {limit} free limit", { count: metrics.totalFeedback, limit: FREE_FEEDBACK_LIMIT })}</span></div></div>
        <DashboardFilters
          key={`${params.search}:${params.status}:${params.sort}`}
          params={{ ...params, page: pagination.page }}
        />
        {data.items.length ? <>
          <div className="mt-4 flex flex-col gap-3 md:hidden">{data.items.map((item) => <article className="ui-card p-4" key={item.id}><StatusSelect feedbackId={item.id} initialStatus={item.status} key={item.status} /><h3 className="mt-3 text-sm font-bold">{item.title}</h3><p className="mt-1 text-[11px] text-muted-foreground">{t("{count} votes · Updated {time}", { count: item.voteCount, time: formatRelativeTime(item.updatedAt, locale, true) })}</p></article>)}</div>
          <div className="ui-table-container mt-4 hidden md:block"><table className="ui-table"><thead><tr><th>{t("Feedback")}</th><th className="ui-table-cell-center w-36">{t("Status")}</th><th className="ui-table-cell-center w-20">{t("Votes")}</th><th className="ui-table-optional ui-table-cell-center w-24">{t("Visibility")}</th><th className="ui-table-optional ui-table-cell-end w-28">{t("Updated")}</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td className="min-w-0"><p className="font-semibold text-foreground">{item.title}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{t("By {author} · {time}", { author: item.authorName, time: formatRelativeTime(item.updatedAt, locale, true) })}</p></td><td className="ui-table-cell-center"><StatusSelect feedbackId={item.id} initialStatus={item.status} key={item.status} /></td><td className="ui-table-cell-center font-bold">{item.voteCount}</td><td className="ui-table-optional ui-table-cell-center text-text">{t(item.isPublic ? "Public" : "Hidden")}</td><td className="ui-table-optional ui-table-cell-end text-muted-foreground">{formatRelativeTime(item.updatedAt, locale, true)}</td></tr>)}</tbody></table></div>
        </> : <div className="mt-5 rounded-surface border border-dashed border-border p-8 text-center"><h3 className="font-bold">{t(noResults ? "No feedback matches these filters" : "No feedback yet")}</h3><p className="mt-2 text-sm text-muted-foreground">{t(noResults ? "Try another search or status." : "Share the public board to start collecting feedback.")}</p>{noResults ? <Link className="mt-4 inline-block text-sm font-semibold text-primary" href="/dashboard">{t("Clear filters")}</Link> : null}</div>}
        <footer className="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted-foreground"><p>{t("Showing {first}–{last} of {total}", { first: firstItem, last: lastItem, total: pagination.filteredCount })}</p><div className="flex gap-2">{pagination.page > 1 ? <Link className={buttonVariants({ size: "small", variant: "secondary" })} href={pageHref(params, pagination.page - 1)}>{t("Previous")}</Link> : <span aria-disabled="true" className={cn(buttonVariants({ size: "small", variant: "secondary" }), "pointer-events-none opacity-50")}>{t("Previous")}</span>}{pagination.page < pagination.totalPages ? <Link className={buttonVariants({ size: "small", variant: "secondary" })} href={pageHref(params, pagination.page + 1)}>{t("Next")}</Link> : <span aria-disabled="true" className={cn(buttonVariants({ size: "small", variant: "secondary" }), "pointer-events-none opacity-50")}>{t("Next")}</span>}</div></footer>
      </section>
    </main>
  );
}
