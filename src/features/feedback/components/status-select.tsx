"use client";

import { useActionState, useRef, useState } from "react";

import { Select, type SelectOption } from "@/components/ui/select";
import { updateFeedbackStatusAction } from "@/features/feedback/actions/update-feedback-status";
import { iconPaths } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { UpdateStatusResult } from "@/server/services/dashboard-status";
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

const initialActionState: UpdateStatusResult = {
  ok: false,
  requestId: "initial",
};

type StatusSelectProps = {
  feedbackId: string;
  initialStatus: DashboardStatus;
};

export function StatusSelect({ feedbackId, initialStatus }: StatusSelectProps) {
  const [status, setStatus] = useState(initialStatus);
  const confirmedStatus = useRef(initialStatus);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    async (previousState: UpdateStatusResult, formData: FormData) => {
      const result = await updateFeedbackStatusAction(previousState, formData);
      if (result.ok) {
        confirmedStatus.current = result.status as DashboardStatus;
      }
      setStatus(confirmedStatus.current);
      return result;
    },
    initialActionState,
  );

  return (
    <form action={formAction} className="min-w-0" ref={formRef}>
      <input name="feedbackId" type="hidden" value={feedbackId} />
      <label className="sr-only" htmlFor={`status-${feedbackId}`}>
        Feedback status
      </label>
      <Select
        aria-describedby={state.error ? `status-error-${feedbackId}` : undefined}
        aria-invalid={Boolean(state.error) || undefined}
        className="w-auto"
        disabled={isPending}
        id={`status-${feedbackId}`}
        name="status"
        onValueChange={(nextStatus) => {
          setStatus(nextStatus as DashboardStatus);
          formRef.current?.requestSubmit();
        }}
        options={statusOptions}
        size="status"
        triggerClassName={cn("max-w-full", statusStyles[status])}
        value={status}
      />
      {state.error ? (
        <span
          className="mt-1 block max-w-40 text-[10px] leading-4 text-error"
          id={`status-error-${feedbackId}`}
          role="alert"
        >
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
