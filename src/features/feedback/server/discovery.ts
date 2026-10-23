import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { feedback, projects } from "@/server/db/schema";

/** 仅选取公开项目及其公开反馈的路由字段；不读取作者、邮箱或反馈正文。 */
export async function getPublicDiscoveryPaths() {
  const [boards, items] = await Promise.all([
    db.select({ slug: projects.slug }).from(projects).where(eq(projects.isPublic, true)),
    db.select({ id: feedback.id, slug: projects.slug }).from(feedback)
      .innerJoin(projects, eq(feedback.projectId, projects.id))
      .where(and(eq(projects.isPublic, true), eq(feedback.isPublic, true))),
  ]);
  return [
    ...boards.flatMap(({ slug }) => [`/p/${slug}`, `/p/${slug}/roadmap`]),
    ...items.map(({ slug, id }) => `/p/${slug}/feedback/${id}`),
  ];
}
