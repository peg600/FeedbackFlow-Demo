"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isBusinessError } from "@/lib/errors";
import { auth } from "@/server/auth";
import { enforceWriteRateLimit } from "@/server/rate-limit";
import { actionClient } from "@/server/safe-action";
import { executePublicFeedbackCreation } from "@/features/feedback/server/creation";
import { createPublicFeedbackSchema } from "@/features/feedback/schemas";

// 为公开项目创建反馈；事务级 advisory lock 串行化遵守同一锁协议的配额检查和插入。
export const createPublicFeedbackAction = actionClient
  .metadata({ operation: "feedback.create" })
  .inputSchema(createPublicFeedbackSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) await enforceWriteRateLimit(session.user.id, "feedback.create");
    let result: Awaited<ReturnType<typeof executePublicFeedbackCreation>>;

    try {
      result = await executePublicFeedbackCreation(parsedInput, session?.user.id ?? null);
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
