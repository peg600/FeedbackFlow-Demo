"use server";

import { revalidatePath } from "next/cache";

import { revalidatePublicProjectPages } from "@/server/cache/project-pages";
import { actionClient } from "@/server/safe-action";
import { requireDashboardAccess } from "@/server/services/project-access";
import { updateOwnedProject } from "@/server/services/project-update";
import { projectSettingsSchema } from "@/validators/project";

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
