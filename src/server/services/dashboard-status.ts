import { updateFeedbackStatusSchema } from "@/validators/dashboard";

export type UpdateStatusResult = {
  error?: string;
  feedbackId?: string;
  ok: boolean;
  requestId: string;
  status?: string;
};

type UpdateStatusDependencies = {
  findOwnedProject: (userId: string) => Promise<{ id: string } | null>;
  getSessionUser: () => Promise<{ id: string } | null>;
  updateOwnedFeedback: (input: {
    feedbackId: string;
    projectId: string;
    status: "completed" | "in_progress" | "planned" | "under_review";
  }) => Promise<boolean>;
};

const rejection = () => ({
  error: "Unable to update feedback. Try again.",
  ok: false,
  requestId: crypto.randomUUID(),
}) satisfies UpdateStatusResult;

export async function executeOwnerStatusUpdate(
  input: unknown,
  dependencies: UpdateStatusDependencies,
): Promise<UpdateStatusResult> {
  const parsed = updateFeedbackStatusSchema.safeParse(input);
  if (!parsed.success) return rejection();

  try {
    const sessionUser = await dependencies.getSessionUser();
    if (!sessionUser) return rejection();

    const project = await dependencies.findOwnedProject(sessionUser.id);
    if (!project) return rejection();

    const updated = await dependencies.updateOwnedFeedback({
      feedbackId: parsed.data.feedbackId,
      projectId: project.id,
      status: parsed.data.status,
    });

    if (!updated) return rejection();

    return {
      feedbackId: parsed.data.feedbackId,
      ok: true,
      requestId: crypto.randomUUID(),
      status: parsed.data.status,
    };
  } catch {
    return rejection();
  }
}
