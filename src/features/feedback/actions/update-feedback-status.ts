"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";
import { actionClient } from "@/server/safe-action";
import { executeOwnerStatusUpdate } from "@/features/feedback/server/status";
import { updateFeedbackStatusSchema } from "@/features/feedback/schemas";

// 验证当前用户对反馈所属项目的所有权后更新状态，并失效控制台、公开看板和路线图缓存。
export const updateFeedbackStatusAction = actionClient
  .metadata({ operation: "feedback.status.update" })
  .inputSchema(updateFeedbackStatusSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    const result = await executeOwnerStatusUpdate(parsedInput, session?.user.id ?? null);

    revalidatePath("/dashboard");
    revalidatePath(`/p/${result.slug}`);
    revalidatePath(`/p/${result.slug}/roadmap`);
    revalidatePath(
      `/p/${result.slug}/feedback/${result.feedbackId}`,
    );

    return { feedbackId: result.feedbackId, status: result.status };
  });
