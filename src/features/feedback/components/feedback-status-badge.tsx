import { createTranslator, type Locale } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

export type FeedbackStatus =
  | "completed"
  | "in_progress"
  | "planned"
  | "under_review";

const statusLabels: Record<FeedbackStatus, string> = {
  completed: "Completed",
  in_progress: "In progress",
  planned: "Planned",
  under_review: "Under review",
};

const statusClasses: Record<FeedbackStatus, string> = {
  completed: "bg-surface-success text-status-completed",
  in_progress: "bg-surface-info text-info",
  planned: "bg-surface-warning text-warning-foreground",
  under_review: "bg-surface-brand text-primary",
};

type FeedbackStatusBadgeProps = {
  className?: string;
  status: FeedbackStatus;
  variant?: "detail" | "list";
  locale?: Locale;
};

export function FeedbackStatusBadge({
  className,
  status,
  variant = "detail",
  locale = "en",
}: FeedbackStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold",
        variant === "detail"
          ? "rounded-token px-3 py-1 text-[10px] tracking-wide uppercase"
          : "rounded-[12px] px-3 py-1 text-[11px]",
        statusClasses[status],
        className,
      )}
    >
      {getFeedbackStatusLabel(status, locale)}
    </span>
  );
}

export function getFeedbackStatusLabel(status: FeedbackStatus, locale: Locale = "en") {
  return createTranslator(locale)(statusLabels[status]);
}
