"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isBusinessError } from "@/lib/errors";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { actionClient } from "@/server/safe-action";
import { executeProjectCreation } from "@/server/services/project-creation";
import { projectSchema } from "@/validators/project";

// 校验创建项目输入并绑定当前登录用户；服务层处理唯一项目/Slug 竞争，成功后刷新缓存并进入控制台。
export const createProjectAction = actionClient
  .metadata({ operation: "project.create" })
  .inputSchema(projectSchema)
  .action(async ({ parsedInput }) => {
    try {
      await executeProjectCreation(parsedInput, {
        // 会话只在服务端读取，客户端不能指定项目所有者。
        getSessionUser: async () => {
          const session = await auth.api.getSession({ headers: await headers() });
          return session ? { id: session.user.id } : null;
        },
        // 依靠数据库唯一约束处理并发创建，再由后续查询判断是幂等成功还是业务冲突。
        insertProject: async (input) => {
          const [project] = await db
            .insert(projects)
            .values(input)
            .onConflictDoNothing()
            .returning({ id: projects.id, slug: projects.slug });
          return project ?? null;
        },
        findProjectByUser: async (userId) => {
          const [project] = await db
            .select({ id: projects.id, slug: projects.slug })
            .from(projects)
            .where(eq(projects.userId, userId))
            .limit(1);
          return project ?? null;
        },
        // 冲突后查询 Slug 所有者，以区分当前用户已有项目和他人占用。
        findProjectBySlug: async (slug) => {
          const [project] = await db
            .select({ id: projects.id, userId: projects.userId })
            .from(projects)
            .where(eq(projects.slug, slug))
            .limit(1);
          return project ?? null;
        },
      });
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
