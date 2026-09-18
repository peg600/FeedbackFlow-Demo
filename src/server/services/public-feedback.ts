import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/server/db";
import { feedback, projects, user, votes } from "@/server/db/schema";
import type { PublicFeedbackSearchParams } from "@/validators/public-feedback";

export const PUBLIC_FEEDBACK_PAGE_SIZE = 4;

/** 构造参数化的标题与描述搜索条件，按普通子串匹配，避免把输入解释成通配符。 */
function searchCondition(search: string) {
  if (!search) return undefined;

  return or(
    sql<boolean>`position(lower(${search}) in lower(${feedback.title})) > 0`,
    sql<boolean>`position(lower(${search}) in lower(coalesce(${feedback.description}, ''))) > 0`,
  );
}

/** 查询公开项目的可见反馈，合并筛选、投票统计与稳定排序，并将页码限制在实际范围内。 */
export const getPublicFeedbackBoard = cache(
  async (slug: string, params: PublicFeedbackSearchParams) => {
    const [project] = await db
      .select({
        description: projects.description,
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
      })
      .from(projects)
      .where(and(eq(projects.isPublic, true), eq(projects.slug, slug)))
      .limit(1);

    if (!project) return null;

    const visibleFeedback = and(
      eq(feedback.isPublic, true),
      eq(feedback.projectId, project.id),
    );
    const filteredFeedback = and(
      visibleFeedback,
      params.status === "all" ? undefined : eq(feedback.status, params.status),
      searchCondition(params.search),
    );
    const [totalResult, filteredResult] = await Promise.all([
      db.select({ value: count() }).from(feedback).where(visibleFeedback),
      db.select({ value: count() }).from(feedback).where(filteredFeedback),
    ]);

    const totalPublicFeedback = Number(totalResult[0]?.value ?? 0);
    const filteredCount = Number(filteredResult[0]?.value ?? 0);
    const totalPages = Math.max(
      1,
      Math.ceil(filteredCount / PUBLIC_FEEDBACK_PAGE_SIZE),
    );
    const page = Math.min(params.page, totalPages);
    const voteCount = count(votes.feedbackId);
    const ordering =
      params.sort === "newest"
        ? [desc(feedback.createdAt), asc(feedback.id)]
        : params.sort === "oldest"
          ? [asc(feedback.createdAt), asc(feedback.id)]
          : [desc(voteCount), desc(feedback.createdAt), asc(feedback.id)];

    const items = await db
      .select({
        description: feedback.description,
        id: feedback.id,
        status: feedback.status,
        title: feedback.title,
        voteCount,
      })
      .from(feedback)
      .leftJoin(votes, eq(feedback.id, votes.feedbackId))
      .where(filteredFeedback)
      .groupBy(feedback.id)
      .orderBy(...ordering)
      .limit(PUBLIC_FEEDBACK_PAGE_SIZE)
      .offset((page - 1) * PUBLIC_FEEDBACK_PAGE_SIZE);

    return {
      items: items.map((item) => ({
        ...item,
        voteCount: Number(item.voteCount),
      })),
      pagination: {
        filteredCount,
        page,
        pageSize: PUBLIC_FEEDBACK_PAGE_SIZE,
        totalPages,
      },
      project,
      totalPublicFeedback,
    };
  },
);

/** 联表校验 Slug 与反馈 ID 的归属及双方公开状态，返回详情与票数，避免跨项目读取。 */
export const getPublicFeedbackDetail = cache(
  async (slug: string, feedbackId: string) => {
    const voteCount = count(votes.feedbackId);
    const [item] = await db
      .select({
        authorName: user.name,
        createdAt: feedback.createdAt,
        description: feedback.description,
        id: feedback.id,
        projectDescription: projects.description,
        projectName: projects.name,
        projectSlug: projects.slug,
        status: feedback.status,
        title: feedback.title,
        updatedAt: feedback.updatedAt,
        voteCount,
      })
      .from(feedback)
      .innerJoin(projects, eq(feedback.projectId, projects.id))
      .innerJoin(user, eq(feedback.userId, user.id))
      .leftJoin(votes, eq(feedback.id, votes.feedbackId))
      .where(
        and(
          eq(feedback.id, feedbackId),
          eq(feedback.isPublic, true),
          eq(projects.isPublic, true),
          eq(projects.slug, slug),
        ),
      )
      .groupBy(feedback.id, projects.id, user.id)
      .limit(1);

    return item
      ? {
          ...item,
          voteCount: Number(item.voteCount),
        }
      : null;
  },
);

/** 在调用方确认反馈可访问后读取当前用户的投票状态；匿名用户直接返回未投票。 */
export async function getPublicFeedbackVoteState(
  feedbackId: string,
  userId: string | undefined,
) {
  if (!userId) return false;

  const [vote] = await db
    .select({ feedbackId: votes.feedbackId })
    .from(votes)
    .where(and(eq(votes.feedbackId, feedbackId), eq(votes.userId, userId)))
    .limit(1);

  return Boolean(vote);
}
