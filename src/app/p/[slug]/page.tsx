import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  FeedbackStatusBadge,
  type FeedbackStatus,
} from "@/features/feedback/components/feedback-status-badge";
import { PublicFeedbackFilters } from "@/features/feedback/components/public-feedback-filters";
import { PublicFeedbackForm } from "@/features/feedback/components/public-feedback-form";
import { PublicProjectHeader } from "@/features/feedback/components/public-project-header";
import { getPublicFeedbackBoard } from "@/features/feedback/server/queries";
import {
  parsePublicFeedbackSearchParams,
  type PublicFeedbackSearchParams,
} from "@/features/feedback/schemas";
import { projectSchema } from "@/features/projects/schemas";

type PublicFeedbackPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// 保留当前筛选条件并只替换页码，用于生成可分享的服务端分页链接。
function pageHref(
  slug: string,
  params: PublicFeedbackSearchParams,
  page: number,
) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.sort !== "votes") query.set("sort", params.sort);
  if (params.status !== "all") query.set("status", params.status);
  if (page > 1) query.set("page", String(page));
  return query.size ? `/p/${slug}?${query}` : `/p/${slug}`;
}

function descriptionPreview(description: string | null) {
  return description || "No additional details were provided.";
}

// 只为合法且公开存在的项目生成动态 SEO 信息，避免泄露隐藏项目。
export async function generateMetadata({
  params,
}: Pick<PublicFeedbackPageProps, "params">): Promise<Metadata> {
  const slug = projectSchema.shape.slug.safeParse((await params).slug);
  if (!slug.success) return {};

  const board = await getPublicFeedbackBoard(
    slug.data,
    parsePublicFeedbackSearchParams(undefined),
  );
  if (!board) return {};

  return {
    description:
      board.project.description ?? `Public feedback board for ${board.project.name}`,
    title: `${board.project.name} feedback`,
  };
}

// 校验路由和查询参数后读取公开看板，并渲染筛选、分页、空状态与反馈提交入口。
export default async function PublicFeedbackPage({
  params,
  searchParams,
}: PublicFeedbackPageProps) {
  const parsedSlug = projectSchema.shape.slug.safeParse((await params).slug);
  if (!parsedSlug.success) notFound();

  const filters = parsePublicFeedbackSearchParams(await searchParams);
  const board = await getPublicFeedbackBoard(parsedSlug.data, filters);
  if (!board) notFound();

  const { pagination, project } = board;
  const firstItem =
    pagination.filteredCount === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(
    pagination.page * pagination.pageSize,
    pagination.filteredCount,
  );
  const hasFilters = Boolean(
    filters.search || filters.status !== "all" || filters.sort !== "votes",
  );

  return (
    <div className="min-h-svh bg-surface">
      <PublicProjectHeader project={project} showSubmitFeedback={false} />

      <section className="bg-surface-brand">
        <div className="mx-auto w-full max-w-content px-5 py-7 md:px-8 md:py-8 xl:px-12">
          <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] text-foreground">
            What should we build next?
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Search existing feedback and vote for priorities. New submissions depend on the project&apos;s available capacity.
          </p>
          <span className="mt-3 inline-flex rounded-[12px] bg-background px-3 py-1 text-[11px] font-bold text-primary">
            {board.totalPublicFeedback} public feedback
          </span>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-content items-start gap-5 px-5 py-6 md:gap-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_21.25rem] xl:px-12 xl:pb-16">
        <section aria-labelledby="feedback-list-heading" className="ui-card rounded-surface p-5 md:p-6">
          <h2 className="sr-only" id="feedback-list-heading">
            Public feedback
          </h2>
          <PublicFeedbackFilters
            key={`${filters.search}:${filters.sort}:${filters.status}`}
            params={filters}
          />
          <p className="mt-3 text-[10px] text-muted-foreground">
            Filters are saved in the URL
          </p>

          {board.items.length ? (
            <>
              <div className="mt-4 flex flex-col gap-3">
                {board.items.map((item) => (
                  <Link
                    className="ui-card ui-card-interactive grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-[12px] p-4 sm:grid-cols-[48px_minmax(0,1fr)_auto]"
                    href={`/p/${project.slug}/feedback/${item.id}`}
                    key={item.id}
                  >
                    <span className="flex h-[52px] w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-placeholder bg-surface text-[13px] font-bold text-foreground">
                      <span aria-hidden="true" className="text-[9px] leading-none text-primary">
                        {"\u25B2"}
                      </span>
                      {item.voteCount}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground sm:truncate">
                        {descriptionPreview(item.description)}
                      </span>
                    </span>
                    <FeedbackStatusBadge
                      className="justify-self-start sm:justify-self-end"
                      status={item.status as FeedbackStatus}
                      variant="list"
                    />
                  </Link>
                ))}
              </div>

              <footer className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                <p>
                  {pagination.totalPages > 1
                    ? `Page ${pagination.page} of ${pagination.totalPages}`
                    : `Showing ${firstItem}-${lastItem} of ${pagination.filteredCount}`}
                </p>
                <div className="flex gap-2">
                  {pagination.page > 1 ? (
                    <Link
                      className={buttonVariants({ size: "small", variant: "secondary" })}
                      href={pageHref(project.slug, filters, pagination.page - 1)}
                    >
                      Previous
                    </Link>
                  ) : null}
                  {pagination.page < pagination.totalPages ? (
                    <Link
                      className={buttonVariants({ size: "small", variant: "secondary" })}
                      href={pageHref(project.slug, filters, pagination.page + 1)}
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </footer>
            </>
          ) : (
            <div className="mt-5 rounded-control border border-dashed border-border p-8 text-center">
              <h3 className="font-bold text-foreground">
                {hasFilters ? "No public feedback matches these filters" : "No public feedback yet"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {hasFilters
                  ? "Try another search or status."
                  : "Share your first feedback to help shape this product."}
              </p>
              {hasFilters ? (
                <Link className="mt-4 inline-block text-sm font-semibold text-primary" href={`/p/${project.slug}`}>
                  Clear filters
                </Link>
              ) : null}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <PublicFeedbackForm slug={project.slug} />
          <section className="rounded-[12px] bg-surface p-5">
            <h2 className="text-sm font-bold text-foreground">How it works</h2>
            <p className="mt-3 text-xs leading-[18px] text-muted-foreground">
              Search first → submit → collect votes → track status.
            </p>
            <p className="mt-3 text-xs font-semibold text-text">
              Hidden feedback never appears publicly.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
