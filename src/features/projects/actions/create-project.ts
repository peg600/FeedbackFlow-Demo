"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isBusinessError } from "@/lib/errors";
import { auth } from "@/server/auth";
import { actionClient } from "@/server/safe-action";
import { executeProjectCreation } from "@/features/projects/server/creation";
import { projectSchema } from "@/features/projects/schemas";

// 校验创建项目输入并绑定当前登录用户；服务层处理唯一项目/Slug 竞争，成功后刷新缓存并进入控制台。
export const createProjectAction = actionClient
  .metadata({ operation: "project.create" })
  .inputSchema(projectSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    try {
      await executeProjectCreation(parsedInput, session?.user.id ?? null);
    } catch (error) {
      if (isBusinessError(error) && error.code === "UNAUTHENTICATED") {
        redirect("/login?returnTo=/onboarding");
      }
      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    redirect("/dashboard");
  });
