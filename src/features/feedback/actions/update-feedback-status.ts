"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { feedback, projects } from "@/server/db/schema";
import {
  executeOwnerStatusUpdate,
  type UpdateStatusResult,
} from "@/server/services/dashboard-status";

export async function updateFeedbackStatusAction(
  _previousState: UpdateStatusResult,
  formData: FormData,
): Promise<UpdateStatusResult> {
  const ownedProject: { current: { id: string; slug: string } | null } = {
    current: null,
  };

  const result = await executeOwnerStatusUpdate(
    {
      feedbackId: formData.get("feedbackId"),
      status: formData.get("status"),
    },
    {
      getSessionUser: async () => {
        const session = await auth.api.getSession({ headers: await headers() });
        return session ? { id: session.user.id } : null;
      },
      findOwnedProject: async (userId) => {
        const [project] = await db
          .select({ id: projects.id, slug: projects.slug })
          .from(projects)
          .where(eq(projects.userId, userId))
          .limit(1);
        ownedProject.current = project ?? null;
        return ownedProject.current;
      },
      updateOwnedFeedback: async ({ feedbackId, projectId, status }) => {
        const rows = await db
          .update(feedback)
          .set({ status, updatedAt: new Date() })
          .where(
            and(eq(feedback.id, feedbackId), eq(feedback.projectId, projectId)),
          )
          .returning({ id: feedback.id });
        return rows.length === 1;
      },
    },
  );

  if (result.ok && ownedProject.current) {
    revalidatePath("/dashboard");
    revalidatePath(`/p/${ownedProject.current.slug}`);
    revalidatePath(`/p/${ownedProject.current.slug}/roadmap`);
    if (result.feedbackId) {
      revalidatePath(
        `/p/${ownedProject.current.slug}/feedback/${result.feedbackId}`,
      );
    }
  }

  return result;
}
