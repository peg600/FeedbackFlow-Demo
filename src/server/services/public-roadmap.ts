import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/server/db";
import { feedback, projects, votes } from "@/server/db/schema";

const statuses = ["planned", "in_progress", "completed"] as const;

/** 从公开反馈的三个路线图状态派生分栏并汇总票数，不维护额外的路线图数据副本。 */
export const getPublicRoadmap = cache(async (slug: string) => {
  const [project] = await db.select({ description: projects.description, id: projects.id, name: projects.name, slug: projects.slug }).from(projects).where(and(eq(projects.slug, slug), eq(projects.isPublic, true))).limit(1);
  if (!project) return null;
  const voteCount = count(votes.feedbackId);
  const items = await db.select({ id: feedback.id, status: feedback.status, title: feedback.title, updatedAt: feedback.updatedAt, voteCount }).from(feedback).leftJoin(votes, eq(votes.feedbackId, feedback.id)).where(and(eq(feedback.projectId, project.id), eq(feedback.isPublic, true), inArray(feedback.status, [...statuses]))).groupBy(feedback.id).orderBy(desc(voteCount), desc(feedback.updatedAt), asc(feedback.id));
  return {
    project,
    lanes: statuses.map((status) => ({ status, items: items.filter((item) => item.status === status).map((item) => ({ ...item, voteCount: Number(item.voteCount) })) })),
  };
});
