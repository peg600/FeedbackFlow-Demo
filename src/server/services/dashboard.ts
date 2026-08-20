import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/server/db";
import { feedback, user, votes } from "@/server/db/schema";
import type {
  DashboardSearchParams,
  DashboardStatus,
} from "@/validators/dashboard";

export const DASHBOARD_PAGE_SIZE = 4;

function searchCondition(search: string) {
  if (!search) return undefined;

  return or(
    sql<boolean>`position(lower(${search}) in lower(${feedback.title})) > 0`,
    sql<boolean>`position(lower(${search}) in lower(coalesce(${feedback.description}, ''))) > 0`,
  );
}

export async function getDashboardData(
  projectId: string,
  params: DashboardSearchParams,
) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const filter = and(
    eq(feedback.projectId, projectId),
    params.status === "all" ? undefined : eq(feedback.status, params.status),
    searchCondition(params.search),
  );

  const [totalResult, monthResult, reviewResult, completedResult, voteResult, filteredResult] =
    await Promise.all([
      db.select({ value: count() }).from(feedback).where(eq(feedback.projectId, projectId)),
      db
        .select({ value: count() })
        .from(feedback)
        .where(and(eq(feedback.projectId, projectId), gte(feedback.createdAt, monthStart))),
      db
        .select({ value: count() })
        .from(feedback)
        .where(and(eq(feedback.projectId, projectId), eq(feedback.status, "under_review"))),
      db
        .select({ value: count() })
        .from(feedback)
        .where(and(eq(feedback.projectId, projectId), eq(feedback.status, "completed"))),
      db
        .select({ value: count(votes.feedbackId) })
        .from(votes)
        .innerJoin(feedback, eq(votes.feedbackId, feedback.id))
        .where(eq(feedback.projectId, projectId)),
      db.select({ value: count() }).from(feedback).where(filter),
    ]);

  const totalFeedback = totalResult[0]?.value ?? 0;
  const filteredCount = filteredResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / DASHBOARD_PAGE_SIZE));
  const page = Math.min(params.page, totalPages);
  const voteCount = count(votes.feedbackId);
  const ordering =
    params.sort === "votes"
      ? [desc(voteCount), desc(feedback.updatedAt), asc(feedback.id)]
      : params.sort === "oldest"
        ? [asc(feedback.createdAt), asc(feedback.id)]
        : [desc(feedback.updatedAt), asc(feedback.id)];

  const items = await db
    .select({
      authorName: user.name,
      id: feedback.id,
      isPublic: feedback.isPublic,
      status: feedback.status,
      title: feedback.title,
      updatedAt: feedback.updatedAt,
      voteCount,
    })
    .from(feedback)
    .innerJoin(user, eq(feedback.userId, user.id))
    .leftJoin(votes, eq(feedback.id, votes.feedbackId))
    .where(filter)
    .groupBy(feedback.id, user.id)
    .orderBy(...ordering)
    .limit(DASHBOARD_PAGE_SIZE)
    .offset((page - 1) * DASHBOARD_PAGE_SIZE);

  const completed = completedResult[0]?.value ?? 0;

  return {
    items: items.map((item) => ({
      ...item,
      status: item.status as DashboardStatus,
      voteCount: Number(item.voteCount),
    })),
    metrics: {
      awaitingReview: reviewResult[0]?.value ?? 0,
      completed,
      completedPercentage:
        totalFeedback === 0 ? 0 : Math.round((completed / totalFeedback) * 100),
      currentMonthFeedback: monthResult[0]?.value ?? 0,
      totalFeedback,
      totalVotes: voteResult[0]?.value ?? 0,
    },
    pagination: {
      filteredCount,
      page,
      pageSize: DASHBOARD_PAGE_SIZE,
      totalPages,
    },
  };
}
