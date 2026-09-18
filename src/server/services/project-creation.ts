import { businessError } from "@/lib/errors";
import { projectSchema, type ProjectValues } from "@/validators/project";

export type ProjectCreationResult = {
  project: { id: string; slug: string };
};

export type CreateProjectDependencies = {
  findProjectBySlug: (
    slug: string,
  ) => Promise<{ id: string; userId: string } | null>;
  findProjectByUser: (
    userId: string,
  ) => Promise<{ id: string; slug: string } | null>;
  getSessionUser: () => Promise<{ id: string } | null>;
  insertProject: (input: {
    description: string | null;
    name: string;
    slug: string;
    userId: string;
  }) => Promise<{ id: string; slug: string } | null>;
};

/** 为当前用户创建唯一项目；重复提交复用已有项目，其他 Slug 冲突转为业务错误。 */
export async function executeProjectCreation(
  input: ProjectValues,
  dependencies: CreateProjectDependencies,
): Promise<ProjectCreationResult> {
  const values = projectSchema.parse(input);
  const sessionUser = await dependencies.getSessionUser();
  if (!sessionUser) throw businessError("UNAUTHENTICATED");

  const project = await dependencies.insertProject({
    description: values.description || null,
    name: values.name,
    slug: values.slug,
    userId: sessionUser.id,
  });

  if (project) return { project };

  // A repeated submission after a successful insert resolves to the user's
  // existing project instead of creating a second workspace.
  const existingProject = await dependencies.findProjectByUser(sessionUser.id);
  if (existingProject) return { project: existingProject };

  const slugOwner = await dependencies.findProjectBySlug(values.slug);
  if (slugOwner) throw businessError("PROJECT_SLUG_TAKEN");

  throw new Error("Project insert returned no row without a known conflict.");
}
