import { getI18n } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicProjectHeader } from "@/features/feedback/components/public-project-header";
import { getPublicRoadmap } from "@/features/feedback/server/roadmap";

type Props = { params: Promise<{ slug: string }> };

const laneMeta = {
  planned: {
    accent: "bg-status-planned",
    label: "Planned",
    tone: "bg-surface-warning text-warning-foreground",
  },
  in_progress: {
    accent: "bg-status-in-progress",
    label: "In progress",
    tone: "bg-surface-info text-info",
  },
  completed: {
    accent: "bg-status-completed",
    label: "Completed",
    tone: "bg-surface-success text-success",
  },
} as const;

// 根据公开项目生成路线图 SEO 信息，不存在时返回明确的未找到标题。
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await getI18n();
  const { slug } = await params;
  const data = await getPublicRoadmap(slug);

  return data
    ? {
        title: t("{project} roadmap | FeedbackFlow", { project: data.project.name }),
        description: t("Public roadmap for {project}.", { project: data.project.name }),
      }
    : { title: t("Roadmap not found | FeedbackFlow") };
}

// 读取由反馈状态派生的公开路线图，每列只展示有限预览并链接到完整筛选结果。
export default async function RoadmapPage({ params }: Props) {
  const { t, locale, formatDate } = await getI18n();
  const { slug } = await params;
  const data = await getPublicRoadmap(slug);
  if (!data) notFound();

  return (
    <div className="min-h-svh bg-surface">
      <PublicProjectHeader locale={locale} active="roadmap" project={data.project} />
      <main className="mx-auto w-full max-w-content px-5 py-8 md:px-8 md:py-10 xl:px-12">
        <h1 className="text-2xl font-bold md:text-[28px]">{t("Public roadmap")}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">{t("See what is planned, in progress, and recently completed.")}</p>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-3">
          {data.lanes.map((lane) => {
            const meta = laneMeta[lane.status];
            const viewAllHref = `/p/${slug}?status=${lane.status}&sort=votes`;

            return (
              <section
                aria-labelledby={`roadmap-${lane.status}`}
                className="overflow-hidden rounded-surface border border-border bg-background"
                key={lane.status}
              >
                <div aria-hidden="true" className={`h-1 ${meta.accent}`} />
                <div className="p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="font-bold" id={`roadmap-${lane.status}`}>
                      {t(meta.label)}
                    </h2>
                    <span
                      className={`shrink-0 rounded-pill px-3 py-1 text-[11px] font-bold ${meta.tone}`}
                    >
                      {t(lane.total === 1 ? "{count} item" : "{count} items", { count: lane.total })}
                    </span>
                  </div>

                  <div className="grid gap-4">
                    {lane.items.length ? (
                      lane.items.map((item) => (
                        <Link
                          className="ui-card ui-card-interactive block min-w-0 bg-surface p-5"
                          href={`/p/${slug}/feedback/${item.id}`}
                          key={item.id}
                        >
                          <h3 className="break-words text-sm font-bold">
                            {item.title}
                          </h3>
                          <div className="mt-5 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
                            <span>{t("{count} votes", { count: item.voteCount })}</span>
                            <span>{t("Updated")}{" "}
                              {formatDate(item.updatedAt, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-placeholder bg-surface p-6 text-center text-sm text-muted-foreground">{t("No {status} items yet.", { status: t(meta.label).toLowerCase() })}</div>
                    )}
                  </div>

                  <Link
                    className="mt-5 inline-flex text-sm font-semibold text-primary hover:text-primary-hover"
                    href={viewAllHref}
                  >{t("View all {status}", { status: t(meta.label).toLowerCase() })}
                  </Link>
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-8 text-[11px] text-muted-foreground">{t("Roadmap columns are derived from feedback status; cards are not manually dragged.")}</p>
      </main>
    </div>
  );
}
