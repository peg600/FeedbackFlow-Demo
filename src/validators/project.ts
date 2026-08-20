import { z } from "zod";

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required.")
    .max(80, "Project name must be at most 80 characters."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug must be at least 3 characters.")
    .max(48, "Slug must be at most 48 characters.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens only.",
    ),
  description: z
    .string()
    .trim()
    .max(240, "Description must be at most 240 characters."),
});

export type ProjectValues = z.infer<typeof projectSchema>;
