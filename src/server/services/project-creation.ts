import { projectSchema, type ProjectValues } from "@/validators/project";

type ProjectField = keyof ProjectValues;

export type CreateProjectResult = {
  code?: "unauthenticated";
  error?: string;
  fieldErrors?: Partial<Record<ProjectField, string>>;
  ok: boolean;
  project?: { id: string; slug: string };
  requestId: string;
};

type CreateProjectDependencies = {
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

const requestId = () => crypto.randomUUID();

const rejection = (
  error = "Unable to create your workspace. Try again.",
  code?: CreateProjectResult["code"],
) =>
  ({
    code,
    error,
    ok: false,
    requestId: requestId(),
  }) satisfies CreateProjectResult;

function validationFailure(
  issues: ReadonlyArray<{ message: string; path: PropertyKey[] }>,
): CreateProjectResult {
  const fieldErrors: Partial<Record<ProjectField, string>> = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === "name" || field === "slug" || field === "description") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }

  return { fieldErrors, ok: false, requestId: requestId() };
}

export async function executeProjectCreation(
  input: unknown,
  dependencies: CreateProjectDependencies,
): Promise<CreateProjectResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.issues);

  try {
    const sessionUser = await dependencies.getSessionUser();
    if (!sessionUser) return rejection(undefined, "unauthenticated");

    const project = await dependencies.insertProject({
      description: parsed.data.description || null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      userId: sessionUser.id,
    });

    if (project) {
      return { ok: true, project, requestId: requestId() };
    }

    // A repeated submission after a successful insert resolves to the user's
    // existing project instead of creating a second workspace.
    const existingProject = await dependencies.findProjectByUser(sessionUser.id);
    if (existingProject) {
      return {
        ok: true,
        project: existingProject,
        requestId: requestId(),
      };
    }

    const slugOwner = await dependencies.findProjectBySlug(parsed.data.slug);
    if (slugOwner) {
      return {
        fieldErrors: { slug: "This public URL slug is already in use." },
        ok: false,
        requestId: requestId(),
      };
    }

    return rejection();
  } catch {
    return rejection();
  }
}
