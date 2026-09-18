import { businessError } from "@/lib/errors";
import {
  createPublicFeedbackSchema,
  type CreatePublicFeedbackValues,
} from "@/validators/public-feedback";

export type PublicFeedbackCreationResult = {
  feedback: { id: string; slug: string };
};

export type CreatePublicFeedbackDependencies = {
  createFeedback: (input: {
    description: string;
    projectId: string;
    slug: string;
    title: string;
    userId: string;
  }) => Promise<
    { id: string } | "feedback_limit" | "public_board_unavailable" | null
  >;
  findPublicProject: (
    slug: string,
  ) => Promise<{ id: string; slug: string } | null>;
  getSessionUser: () => Promise<{ id: string } | null>;
};

/** 验证登录和公开反馈板，调用受配额保护的写入，并将配额或可见性失败转为业务错误。 */
export async function executePublicFeedbackCreation(
  input: CreatePublicFeedbackValues,
  dependencies: CreatePublicFeedbackDependencies,
): Promise<PublicFeedbackCreationResult> {
  const values = createPublicFeedbackSchema.parse(input);
  const sessionUser = await dependencies.getSessionUser();
  if (!sessionUser) throw businessError("UNAUTHENTICATED");

  const project = await dependencies.findPublicProject(values.slug);
  if (!project) throw businessError("PUBLIC_BOARD_UNAVAILABLE");

  const created = await dependencies.createFeedback({
    description: values.description,
    projectId: project.id,
    slug: project.slug,
    title: values.title,
    userId: sessionUser.id,
  });

  if (created === "feedback_limit") {
    throw businessError("FEEDBACK_LIMIT_REACHED");
  }
  if (created === "public_board_unavailable") {
    throw businessError("PUBLIC_BOARD_UNAVAILABLE");
  }
  if (!created) throw new Error("Feedback insert returned no row.");

  return { feedback: { id: created.id, slug: project.slug } };
}

export type { CreatePublicFeedbackValues };
