import { z } from "zod";

export const dashboardStatuses = [
  "under_review",
  "planned",
  "in_progress",
  "completed",
] as const;

export const dashboardStatusFilterSchema = z.enum([
  "all",
  ...dashboardStatuses,
]);
export const dashboardSortSchema = z.enum(["newest", "oldest", "votes"]);
export const feedbackStatusSchema = z.enum(dashboardStatuses);

export type DashboardStatus = z.infer<typeof feedbackStatusSchema>;
export type DashboardStatusFilter = z.infer<
  typeof dashboardStatusFilterSchema
>;
export type DashboardSort = z.infer<typeof dashboardSortSchema>;

export type DashboardSearchParams = {
  page: number;
  search: string;
  sort: DashboardSort;
  status: DashboardStatusFilter;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDashboardSearchParams(
  input: RawSearchParams | undefined,
): DashboardSearchParams {
  const search = z
    .string()
    .trim()
    .max(120)
    .catch("")
    .parse(first(input?.search) ?? "");
  const status = dashboardStatusFilterSchema
    .catch("all")
    .parse(first(input?.status));
  const sort = dashboardSortSchema
    .catch("newest")
    .parse(first(input?.sort));
  const page = z.coerce
    .number()
    .int()
    .positive()
    .max(10_000)
    .catch(1)
    .parse(first(input?.page));

  return { page, search, sort, status };
}

export const updateFeedbackStatusSchema = z.object({
  feedbackId: z.uuid(),
  status: feedbackStatusSchema,
});
