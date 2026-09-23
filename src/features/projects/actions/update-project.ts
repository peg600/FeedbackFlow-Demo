"use server";

import { revalidatePath } from "next/cache";

import { revalidatePublicProjectPages } from "@/features/projects/server/cache";
import { actionClient } from "@/server/safe-action";
import { requireDashboardAccess } from "@/features/projects/server/access";
import { updateOwnedProject } from "@/features/projects/server/settings";
import { projectSettingsSchema } from "@/features/projects/schemas";

// 仅允许项目所有者更新设置，并同时刷新新旧 Slug 对应的公开页面缓存。
export const updateProjectAction = actionClient
  .metadata({ operation: "project.update" })
  .inputSchema(projectSettingsSchema)
  .action(async ({ parsedInput }) => {
    const { session } = await requireDashboardAccess();
    const result = await updateOwnedProject(session.user.id, parsedInput);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings");
    for (const slug of new Set([result.oldSlug, result.project.slug])) {
      revalidatePublicProjectPages(slug);
    }

    return {
      message: "Project settings saved." as const,
      project: result.project,
    };
  });
