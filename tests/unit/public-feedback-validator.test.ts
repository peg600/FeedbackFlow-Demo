import { describe, expect, it } from "vitest";

import {
  createPublicFeedbackSchema,
  parsePublicFeedbackSearchParams,
  publicFeedbackRouteSchema,
} from "@/validators/public-feedback";

describe("publicFeedbackRouteSchema", () => {
  it("normalizes a public project slug", () => {
    expect(
      publicFeedbackRouteSchema.parse({
        feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
        slug: "  ACME-STUDIO  ",
      }),
    ).toEqual({
      feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
      slug: "acme-studio",
    });
  });

  it("rejects unsafe routes before a public query or vote mutation", () => {
    expect(
      publicFeedbackRouteSchema.safeParse({
        feedbackId: "not-a-uuid",
        slug: "../another-project",
      }).success,
    ).toBe(false);
  });

  it("uses public-board defaults for invalid filters", () => {
    expect(
      parsePublicFeedbackSearchParams({
        page: "-1",
        search: "x".repeat(121),
        sort: "popular",
        status: "hidden",
      }),
    ).toEqual({ page: 1, search: "", sort: "votes", status: "all" });
  });

  it("normalizes bounded public feedback input", () => {
    expect(
      createPublicFeedbackSchema.parse({
        description: "  A comfortable theme after hours.  ",
        slug: " ACME-STUDIO ",
        title: "  Dark mode  ",
      }),
    ).toEqual({
      description: "A comfortable theme after hours.",
      slug: "acme-studio",
      title: "Dark mode",
    });
  });
});
