import { and, eq, ne } from "drizzle-orm";

import { businessError } from "@/lib/errors";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import {
  projectSettingsSchema,
  type ProjectSettingsValues,
} from "@/features/projects/schemas";

export type ProjectUpdateResult = {
  oldSlug: string;
  project: {
    description: string | null;
    isPublic: boolean;
    name: string;
    slug: string;
  };
};

export type ProjectUpdateDependencies = {
  findProjectByUser: (
    userId: string,
  ) => Promise<{ id: string; slug: string } | null>;
  findSlugConflict: (
    slug: string,
    projectId: string,
  ) => Promise<{ id: string } | null>;
  updateProject: (input: {
    description: string | null;
    id: string;
    isPublic: boolean;
    name: string;
    slug: string;
    userId: string;
  }) => Promise<{
    description: string | null;
    isPublic: boolean;
    name: string;
    slug: string;
  } | null>;
};

const defaultDependencies: ProjectUpdateDependencies = {
  // 根据服务端身份查找项目，避免接受客户端指定的所有者。
  findProjectByUser: async (userId) => {
    const [project] = await db
      .select({ id: projects.id, slug: projects.slug })
      .from(projects)
      .where(eq(projects.userId, userId))
      .limit(1);
    return project ?? null;
  },
  // 检查 Slug 是否被其他项目占用，排除当前项目自身。
  findSlugConflict: async (slug, projectId) => {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.slug, slug), ne(projects.id, projectId)))
      .limit(1);
    return project ?? null;
  },
  // 将所有权条件带入更新语句，并用返回记录判断项目是否仍然存在。
  updateProject: async (input) => {
    const [project] = await db
      .update(projects)
      .set({
        description: input.description,
        isPublic: input.isPublic,
        name: input.name,
        slug: input.slug,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, input.id), eq(projects.userId, input.userId)))
      .returning({
        description: projects.description,
        isPublic: projects.isPublic,
        name: projects.name,
        slug: projects.slug,
      });
    return project ?? null;
  },
};

/** 校验项目归属与 Slug 冲突后保存设置；并发约束异常交由 Action 统一转换。 */
export async function updateOwnedProject(
  userId: string,
  input: ProjectSettingsValues,
  dependencies: ProjectUpdateDependencies = defaultDependencies,
): Promise<ProjectUpdateResult> {
  const values = projectSettingsSchema.parse(input);
  const current = await dependencies.findProjectByUser(userId);
  if (!current) throw businessError("PROJECT_NOT_FOUND");

  const conflict = await dependencies.findSlugConflict(values.slug, current.id);
  if (conflict) throw businessError("PROJECT_SLUG_TAKEN");

  const project = await dependencies.updateProject({
    description: values.description || null,
    id: current.id,
    isPublic: values.isPublic,
    name: values.name,
    slug: values.slug,
    userId,
  });

  // The owner/project pair may disappear after the reads above. Checking the
  // returned row avoids reporting a successful update in that race.
  if (!project) throw businessError("PROJECT_NOT_FOUND");

  return { oldSlug: current.slug, project };
}
