import {
  createPublicFeedbackSchema,
  type CreatePublicFeedbackValues,
} from "@/validators/public-feedback";

type FeedbackField = "description" | "title";

export type CreatePublicFeedbackResult = {
  code?: "feedback_limit" | "unauthenticated";
  error?: string;
  feedback?: { id: string; slug: string };
  fieldErrors?: Partial<Record<FeedbackField, string>>;
  ok: boolean;
  requestId: string;
};

type CreatePublicFeedbackDependencies = {
  createFeedback: (input: {
    description: string;
    projectId: string;
    slug: string;
    title: string;
    userId: string;
  }) => Promise<{ id: string } | "feedback_limit" | null>;
  findPublicProject: (slug: string) => Promise<{ id: string; slug: string } | null>;
  getSessionUser: () => Promise<{ id: string } | null>;
};

const requestId = () => crypto.randomUUID();

function rejection(
  error = "Unable to submit feedback. Try again.",
  code?: CreatePublicFeedbackResult["code"],
): CreatePublicFeedbackResult {
  return { code, error, ok: false, requestId: requestId() };
}

function validationFailure(
  issues: ReadonlyArray<{ message: string; path: PropertyKey[] }>,
): CreatePublicFeedbackResult {
  const fieldErrors: Partial<Record<FeedbackField, string>> = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if ((field === "title" || field === "description") && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return Object.keys(fieldErrors).length
    ? { fieldErrors, ok: false, requestId: requestId() }
    : rejection();
}

export async function executePublicFeedbackCreation(
  input: unknown,
  dependencies: CreatePublicFeedbackDependencies,
): Promise<CreatePublicFeedbackResult> {
  const parsed = createPublicFeedbackSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error.issues);

  try {
    const sessionUser = await dependencies.getSessionUser();
    if (!sessionUser) return rejection(undefined, "unauthenticated");

    const project = await dependencies.findPublicProject(parsed.data.slug);
    if (!project) return rejection("This public board is unavailable.");

    const created = await dependencies.createFeedback({
      description: parsed.data.description,
      projectId: project.id,
      slug: project.slug,
      title: parsed.data.title,
      userId: sessionUser.id,
    });

    if (created === "feedback_limit") {
      return rejection(
        "This public board has reached its 50 feedback limit.",
        "feedback_limit",
      );
    }
    if (!created) return rejection();

    return {
      feedback: { id: created.id, slug: project.slug },
      ok: true,
      requestId: requestId(),
    };
  } catch {
    return rejection();
  }
}

export type { CreatePublicFeedbackValues };
