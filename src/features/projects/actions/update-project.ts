"use server";

import { revalidatePath } from "next/cache";

import { requireDashboardAccess } from "@/server/services/project-access";
import { updateOwnedProject } from "@/server/services/project-update";
import { projectSettingsSchema } from "@/validators/project";

export type ProjectSettingsState = {
  errors?: Partial<Record<"name" | "slug" | "description" | "isPublic", string[]>>;
  message?: string;
  success?: boolean;
};

export async function updateProjectAction(
  _state: ProjectSettingsState,
  formData: FormData,
): Promise<ProjectSettingsState> {
  const parsed = projectSettingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    isPublic: formData.get("isPublic") === "on",
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };

  const { session } = await requireDashboardAccess();
  try {
    const result = await updateOwnedProject(session.user.id, parsed.data);
    if (!result.ok) {
      return result.field === "slug"
        ? { errors: { slug: [result.message] }, message: result.message }
        : { message: result.message };
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    for (const slug of new Set([result.oldSlug, result.project.slug])) {
      revalidatePath(`/p/${slug}`);
      revalidatePath(`/p/${slug}/roadmap`);
    }
    return { success: true, message: "Project settings saved." };
  } catch {
    return { message: "Settings could not be saved. Please try again." };
  }
}
