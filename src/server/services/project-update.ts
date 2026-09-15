import { and, eq, ne } from "drizzle-orm";

import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import type { ProjectSettingsValues } from "@/validators/project";

export type ProjectUpdateResult =
  | { ok: true; oldSlug: string; project: { slug: string } }
  | { ok: false; field?: "slug"; message: string };

export async function updateOwnedProject(
  userId: string,
  values: ProjectSettingsValues,
): Promise<ProjectUpdateResult> {
  const [current] = await db.select({ id: projects.id, slug: projects.slug }).from(projects).where(eq(projects.userId, userId)).limit(1);
  if (!current) return { ok: false, message: "Project not found." };

  const [conflict] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.slug, values.slug), ne(projects.id, current.id))).limit(1);
  if (conflict) return { ok: false, field: "slug", message: "That public URL is already in use." };

  await db.update(projects).set({
    description: values.description || null,
    isPublic: values.isPublic,
    name: values.name,
    slug: values.slug,
    updatedAt: new Date(),
  }).where(and(eq(projects.id, current.id), eq(projects.userId, userId)));

  return { ok: true, oldSlug: current.slug, project: { slug: values.slug } };
}
