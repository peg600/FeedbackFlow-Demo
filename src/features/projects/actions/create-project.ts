"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import {
  executeProjectCreation,
  type CreateProjectResult,
} from "@/server/services/project-creation";

export async function createProjectAction(
  _previousState: CreateProjectResult | null,
  formData: FormData,
): Promise<CreateProjectResult> {
  const result = await executeProjectCreation(
    {
      description: formData.get("description"),
      name: formData.get("name"),
      slug: formData.get("slug"),
    },
    {
      getSessionUser: async () => {
        const session = await auth.api.getSession({ headers: await headers() });
        return session ? { id: session.user.id } : null;
      },
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
      findProjectBySlug: async (slug) => {
        const [project] = await db
          .select({ id: projects.id, userId: projects.userId })
          .from(projects)
          .where(eq(projects.slug, slug))
          .limit(1);
        return project ?? null;
      },
    },
  );

  if (result.code === "unauthenticated") {
    redirect("/login?returnTo=/onboarding");
  }

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    redirect("/dashboard");
  }

  return result;
}
