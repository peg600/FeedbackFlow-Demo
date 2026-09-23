import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";

import { businessError } from "@/lib/errors";
import { projectSchema, type ProjectValues } from "@/features/projects/schemas";

export type ProjectCreationResult = {
  project: { id: string; slug: string; };
};

export type CreateProjectDependencies = {
  findProjectBySlug: (
    slug: string,
  ) => Promise<{ id: string; userId: string; } | null>;
  findProjectByUser: (
    userId: string,
  ) => Promise<{ id: string; slug: string; } | null>;
  insertProject: (input: {
    description: string | null;
    name: string;
    slug: string;
    userId: string;
  }) => Promise<{ id: string; slug: string; } | null>;
};

const defaultDependencies: CreateProjectDependencies = {
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
  }
};

/** 为入口传入的可信会话用户创建唯一项目；重复提交复用已有项目，其他 Slug 冲突转为业务错误。 */
export async function executeProjectCreation(
  input: ProjectValues,
  userId: string | null,
  dependencies: CreateProjectDependencies = defaultDependencies,
): Promise<ProjectCreationResult> {
  const values = projectSchema.parse(input);
  if (!userId) throw businessError("UNAUTHENTICATED");

  const project = await dependencies.insertProject({
    description: values.description || null,
    name: values.name,
    slug: values.slug,
    userId,
  });

  if (project) return { project };

  // A repeated submission after a successful insert resolves to the user's
  // existing project instead of creating a second workspace.
  const existingProject = await dependencies.findProjectByUser(userId);
  if (existingProject) return { project: existingProject };

  const slugOwner = await dependencies.findProjectBySlug(values.slug);
  if (slugOwner) throw businessError("PROJECT_SLUG_TAKEN");

  throw new Error("Project insert returned no row without a known conflict.");
}
