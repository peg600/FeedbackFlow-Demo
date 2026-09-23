import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { insertPublicFeedback } from "@/features/feedback/server/write";

import { businessError } from "@/lib/errors";
import {
  createPublicFeedbackSchema,
  type CreatePublicFeedbackValues,
} from "@/features/feedback/schemas";

export type PublicFeedbackCreationResult = {
  feedback: { id: string; slug: string; };
};

export type CreatePublicFeedbackDependencies = {
  createFeedback: (input: {
    description: string;
    projectId: string;
    slug: string;
    title: string;
    userId: string;
  }) => Promise<
    { id: string; } | "feedback_limit" | "public_board_unavailable" | null
  >;
  findPublicProject: (
    slug: string,
  ) => Promise<{ id: string; slug: string; } | null>;
};

const defaultDependencies: CreatePublicFeedbackDependencies = {
  // 获取项目配额锁后复核公开状态、统计并插入；配额保护要求其他创建入口也遵守同一锁协议。
  createFeedback: (input) => insertPublicFeedback(db, input),
  // 尽早拒绝不存在或隐藏的项目；取得配额锁后还会复查公开状态与 Slug。
  findPublicProject: async (slug) => {
    const [project] = await db
      .select({ id: projects.id, slug: projects.slug })
      .from(projects)
      .where(and(eq(projects.isPublic, true), eq(projects.slug, slug)))
      .limit(1);
    return project ?? null;
  }
};

/** 使用入口传入的可信会话身份检查公开反馈板，调用受配额保护的写入，并转换业务失败。 */
export async function executePublicFeedbackCreation(
  input: CreatePublicFeedbackValues,
  userId: string | null,
  dependencies: CreatePublicFeedbackDependencies = defaultDependencies,
): Promise<PublicFeedbackCreationResult> {
  const values = createPublicFeedbackSchema.parse(input);
  if (!userId) throw businessError("UNAUTHENTICATED");

  const project = await dependencies.findPublicProject(values.slug);
  if (!project) throw businessError("PUBLIC_BOARD_UNAVAILABLE");

  const created = await dependencies.createFeedback({
    description: values.description,
    projectId: project.id,
    slug: project.slug,
    title: values.title,
    userId,
  });

  if (created === "feedback_limit") {
    throw businessError("FEEDBACK_LIMIT_REACHED");
  }
  if (created === "public_board_unavailable") {
    throw businessError("PUBLIC_BOARD_UNAVAILABLE");
  }
  if (!created) throw new Error("Feedback insert returned no row.");

  return { feedback: { id: created.id, slug: project.slug } };
}

export type { CreatePublicFeedbackValues };
