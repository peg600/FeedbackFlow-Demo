"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";
import { revalidatePublicProjectPages } from "@/features/projects/server/cache";
import { actionClient } from "@/server/safe-action";
import { enforceWriteRateLimit } from "@/server/rate-limit";
import { executeFeedbackVote } from "@/features/feedback/server/voting";
import { publicFeedbackRouteSchema } from "@/features/feedback/schemas";

// 校验公开范围和登录身份后切换当前用户的投票，再查询票数并返回本次操作确认的投票状态。
export const voteFeedbackAction = actionClient
  .metadata({ operation: "feedback.vote" })
  .inputSchema(publicFeedbackRouteSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) await enforceWriteRateLimit(session.user.id, "feedback.vote");
    const result = await executeFeedbackVote(parsedInput, session?.user.id ?? null);

    revalidatePath("/dashboard");
    revalidatePublicProjectPages(parsedInput.slug, parsedInput.feedbackId);

    return result;
  });
