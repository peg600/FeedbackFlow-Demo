import { businessError } from "@/lib/errors";
import {
  updateFeedbackStatusSchema,
  type DashboardStatus,
} from "@/validators/dashboard";

export type OwnerStatusUpdateResult = {
  feedbackId: string;
  status: DashboardStatus;
};

export type UpdateStatusDependencies = {
  findOwnedProject: (userId: string) => Promise<{ id: string } | null>;
  getSessionUser: () => Promise<{ id: string } | null>;
  updateOwnedFeedback: (input: {
    feedbackId: string;
    projectId: string;
    status: DashboardStatus;
  }) => Promise<boolean>;
};

/** 验证当前用户的项目后更新其反馈状态，将资源不存在或不归属该项目统一视为不可用。 */
export async function executeOwnerStatusUpdate(
  input: { feedbackId: string; status: DashboardStatus },
  dependencies: UpdateStatusDependencies,
): Promise<OwnerStatusUpdateResult> {
  const values = updateFeedbackStatusSchema.parse(input);
  const sessionUser = await dependencies.getSessionUser();
  if (!sessionUser) throw businessError("UNAUTHENTICATED");

  const project = await dependencies.findOwnedProject(sessionUser.id);
  if (!project) throw businessError("PROJECT_NOT_FOUND");

  const updated = await dependencies.updateOwnedFeedback({
    feedbackId: values.feedbackId,
    projectId: project.id,
    status: values.status,
  });

  if (!updated) throw businessError("FEEDBACK_NOT_AVAILABLE");

  return {
    feedbackId: values.feedbackId,
    status: values.status,
  };
}
