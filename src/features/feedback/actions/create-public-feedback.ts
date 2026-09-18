"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isBusinessError } from "@/lib/errors";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { feedback, projects } from "@/server/db/schema";
import { actionClient } from "@/server/safe-action";
import { executePublicFeedbackCreation } from "@/server/services/feedback-creation";
import { createPublicFeedbackSchema } from "@/validators/public-feedback";

// 为公开项目创建反馈；事务级 advisory lock 串行化遵守同一锁协议的配额检查和插入。
export const createPublicFeedbackAction = actionClient
  .metadata({ operation: "feedback.create" })
  .inputSchema(createPublicFeedbackSchema)
  .action(async ({ parsedInput }) => {
    let result: Awaited<ReturnType<typeof executePublicFeedbackCreation>>;

    try {
      result = await executePublicFeedbackCreation(parsedInput, {
        // 获取项目配额锁后复核公开状态、统计并插入；配额保护要求其他创建入口也遵守同一锁协议。
        createFeedback: async (input) =>
          db.transaction(async (tx) => {
            await tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${input.projectId}))`,
            );

            const [project] = await tx
              .select({ id: projects.id })
              .from(projects)
              .where(
                and(
                  eq(projects.id, input.projectId),
                  eq(projects.isPublic, true),
                  eq(projects.slug, input.slug),
                ),
              )
              .limit(1);
            if (!project) return "public_board_unavailable" as const;

            const [feedbackCount] = await tx
              .select({ value: count() })
              .from(feedback)
              .where(eq(feedback.projectId, project.id));
            if (Number(feedbackCount?.value ?? 0) >= 50) {
              return "feedback_limit" as const;
            }

            const [created] = await tx
              .insert(feedback)
              .values({
                description: input.description,
                projectId: project.id,
                title: input.title,
                userId: input.userId,
              })
              .returning({ id: feedback.id });
            return created ?? null;
          }),
        // 尽早拒绝不存在或隐藏的项目；取得配额锁后还会复查公开状态与 Slug。
        findPublicProject: async (slug) => {
          const [project] = await db
            .select({ id: projects.id, slug: projects.slug })
            .from(projects)
            .where(and(eq(projects.isPublic, true), eq(projects.slug, slug)))
            .limit(1);
          return project ?? null;
        },
        getSessionUser: async () => {
          const session = await auth.api.getSession({ headers: await headers() });
          return session ? { id: session.user.id } : null;
        },
      });
    } catch (error) {
      if (isBusinessError(error) && error.code === "UNAUTHENTICATED") {
        redirect(
          `/login?returnTo=${encodeURIComponent(`/p/${parsedInput.slug}`)}`,
        );
      }
      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath(`/p/${result.feedback.slug}`);
    redirect(
      `/p/${result.feedback.slug}/feedback/${result.feedback.id}`,
    );
  });
