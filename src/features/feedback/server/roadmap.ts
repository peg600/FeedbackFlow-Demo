import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/server/db";
import { feedback, projects, votes } from "@/server/db/schema";

const statuses = ["planned", "in_progress", "completed"] as const;
const roadmapPreviewLimit = 4;

type RoadmapStatus = (typeof statuses)[number];

/** 按路线图状态读取最高票的有限预览，避免公开页面随反馈总量无限增长。 */
async function getRoadmapPreview(projectId: string, status: RoadmapStatus) {
  const voteCount = count(votes.feedbackId);
  return db
    .select({
      id: feedback.id,
      status: feedback.status,
      title: feedback.title,
      updatedAt: feedback.updatedAt,
      voteCount,
    })
    .from(feedback)
    .leftJoin(votes, eq(votes.feedbackId, feedback.id))
    .where(
      and(
        eq(feedback.projectId, projectId),
        eq(feedback.isPublic, true),
        eq(feedback.status, status),
      ),
    )
    .groupBy(feedback.id)
    .orderBy(desc(voteCount), desc(feedback.updatedAt), asc(feedback.id))
    .limit(roadmapPreviewLimit);
}

/** 从公开反馈的三个路线图状态派生分栏并汇总票数，不维护额外的路线图数据副本。 */
export const getPublicRoadmap = cache(async (slug: string) => {
  const [project] = await db.select({ description: projects.description, id: projects.id, name: projects.name, slug: projects.slug }).from(projects).where(and(eq(projects.slug, slug), eq(projects.isPublic, true))).limit(1);
  if (!project) return null;

  const [totals, ...previews] = await Promise.all([
    db
      .select({ status: feedback.status, total: count() })
      .from(feedback)
      .where(
        and(
          eq(feedback.projectId, project.id),
          eq(feedback.isPublic, true),
          inArray(feedback.status, [...statuses]),
        ),
      )
      .groupBy(feedback.status),
    ...statuses.map((status) => getRoadmapPreview(project.id, status)),
  ]);
  const totalsByStatus = new Map(
    totals.map((row) => [row.status, Number(row.total)]),
  );

  return {
    project,
    lanes: statuses.map((status, index) => ({
      status,
      total: totalsByStatus.get(status) ?? 0,
      items: previews[index].map((item) => ({
        ...item,
        voteCount: Number(item.voteCount),
      })),
    })),
  };
});
