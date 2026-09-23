import { z } from "zod";

import { projectSchema } from "@/features/projects/schemas";

export const publicFeedbackRouteSchema = z.object({
  feedbackId: z.uuid(),
  slug: projectSchema.shape.slug,
});

export type PublicFeedbackRoute = z.infer<typeof publicFeedbackRouteSchema>;

export const feedbackStatuses = [
  "under_review",
  "planned",
  "in_progress",
  "completed",
] as const;

export const feedbackStatusSchema = z.enum(feedbackStatuses);
export const publicFeedbackSortSchema = z.enum(["votes", "newest", "oldest"]);

export type PublicFeedbackSearchParams = {
  page: number;
  search: string;
  sort: z.infer<typeof publicFeedbackSortSchema>;
  status: "all" | z.infer<typeof feedbackStatusSchema>;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** 解析公开反馈板的查询参数并限制长度与页码范围，防止任意 URL 输入直接进入查询。 */
export function parsePublicFeedbackSearchParams(
  input: RawSearchParams | undefined,
): PublicFeedbackSearchParams {
  return {
    page: z.coerce
      .number()
      .int()
      .positive()
      .max(10_000)
      .catch(1)
      .parse(first(input?.page)),
    search: z
      .string()
      .trim()
      .max(120)
      .catch("")
      .parse(first(input?.search) ?? ""),
    sort: publicFeedbackSortSchema
      .catch("votes")
      .parse(first(input?.sort)),
    status: z
      .enum(["all", ...feedbackStatuses])
      .catch("all")
      .parse(first(input?.status)),
  };
}

export const createPublicFeedbackSchema = z.object({
  description: z
    .string()
    .trim()
    .min(8, "Details must be at least 8 characters.")
    .max(2_000, "Details must be at most 2,000 characters."),
  slug: projectSchema.shape.slug,
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(140, "Title must be at most 140 characters."),
});

export type CreatePublicFeedbackValues = z.infer<
  typeof createPublicFeedbackSchema
>;

export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;

export const updateFeedbackStatusSchema = z.object({
  feedbackId: z.uuid(),
  status: feedbackStatusSchema,
});
