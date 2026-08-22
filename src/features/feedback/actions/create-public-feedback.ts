"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { feedback, projects } from "@/server/db/schema";
import {
  executePublicFeedbackCreation,
  type CreatePublicFeedbackResult,
} from "@/server/services/feedback-creation";
import { createPublicFeedbackSchema } from "@/validators/public-feedback";

export async function createPublicFeedbackAction(
  _previousState: CreatePublicFeedbackResult | null,
  formData: FormData,
): Promise<CreatePublicFeedbackResult> {
  const result = await executePublicFeedbackCreation(
    {
      description: formData.get("description"),
      slug: formData.get("slug"),
      title: formData.get("title"),
    },
    {
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
          if (!project) return null;

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
    },
  );

  if (result.code === "unauthenticated") {
    const parsed = createPublicFeedbackSchema.safeParse({
      description: formData.get("description"),
      slug: formData.get("slug"),
      title: formData.get("title"),
    });
    redirect(
      parsed.success
        ? `/login?returnTo=${encodeURIComponent(`/p/${parsed.data.slug}`)}`
        : "/login",
    );
  }

  if (result.ok && result.feedback) {
    revalidatePath("/dashboard");
    revalidatePath(`/p/${result.feedback.slug}`);
    redirect(`/p/${result.feedback.slug}/feedback/${result.feedback.id}`);
  }

  return result;
}
