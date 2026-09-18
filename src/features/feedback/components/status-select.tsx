"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";

import { Select, type SelectOption } from "@/components/ui/select";
import { updateFeedbackStatusAction } from "@/features/feedback/actions/update-feedback-status";
import { iconPaths } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { ACTION_NETWORK_ERROR, getActionErrorMessage } from "@/lib/action-errors";
import type { DashboardStatus } from "@/validators/dashboard";

const labels: Record<DashboardStatus, string> = {
  completed: "Completed",
  in_progress: "In progress",
  planned: "Planned",
  under_review: "Under review",
};

const statusStyles: Record<DashboardStatus, string> = {
  completed: "bg-surface-success text-success hover:bg-surface-success",
  in_progress: "bg-surface-info text-info hover:bg-surface-info",
  planned: "bg-surface-warning text-warning-foreground hover:bg-surface-warning",
  under_review: "bg-surface-brand text-primary hover:bg-surface-brand",
};

const statusOptions: readonly SelectOption[] = [
  {
    indicatorSrc: iconPaths.selectStatusPlanned,
    label: labels.planned,
    value: "planned",
  },
  {
    indicatorSrc: iconPaths.selectStatusInProgress,
    label: labels.in_progress,
    value: "in_progress",
  },
  {
    indicatorSrc: iconPaths.selectStatusUnderReview,
    label: labels.under_review,
    value: "under_review",
  },
  {
    indicatorSrc: iconPaths.selectStatusCompleted,
    label: labels.completed,
    value: "completed",
  },
];

type StatusSelectProps = {
  feedbackId: string;
  initialStatus: DashboardStatus;
};

// 乐观显示新的反馈状态；Action 失败时回滚到最后一次由服务端确认的状态并展示统一错误。
export function StatusSelect({ feedbackId, initialStatus }: StatusSelectProps) {
  const [status, setStatus] = useState(initialStatus);
  const router = useRouter();
  const [transportError, setTransportError] = useState<string>();
  const confirmedStatus = useRef(initialStatus);
  const { result, execute, isPending } = useAction(updateFeedbackStatusAction, {
    onExecute: () => setTransportError(undefined),
    onSuccess: ({ data }) => {
      confirmedStatus.current = data.status;
      setStatus(confirmedStatus.current);
    },
    onError: ({ error }) => {
      setStatus(confirmedStatus.current);
      if (error.serverError?.code === "UNAUTHENTICATED") {
        router.push("/login?returnTo=/dashboard");
      }
      if (error.thrownError) setTransportError(ACTION_NETWORK_ERROR);
    },
  });
  const errorMessage = isPending
    ? undefined
    : transportError ?? getActionErrorMessage(result, "This request is invalid. Refresh the page and try again.");

  return (
    <div className="min-w-0">
      <label className="sr-only" htmlFor={`status-${feedbackId}`}>
        Feedback status
      </label>
      <Select
        aria-describedby={errorMessage ? `status-error-${feedbackId}` : undefined}
        aria-invalid={Boolean(errorMessage) || undefined}
        className="w-auto"
        disabled={isPending}
        id={`status-${feedbackId}`}
        name="status"
        onValueChange={(nextStatus) => {
          setStatus(nextStatus as DashboardStatus);
          execute({ feedbackId, status: nextStatus as DashboardStatus });
        }}
        options={statusOptions}
        size="status"
        triggerClassName={cn("max-w-full", statusStyles[status])}
        value={status}
      />
      {errorMessage ? (
        <span
          className="mt-1 block max-w-40 text-[10px] leading-4 text-error"
          id={`status-error-${feedbackId}`}
          role="alert"
        >
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
