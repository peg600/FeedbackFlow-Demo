import { describe, expect, it } from "vitest";

import { projectSchema } from "@/validators/project";

describe("projectSchema", () => {
  it("normalizes project input", () => {
    expect(
      projectSchema.parse({
        description: "  Help us choose.  ",
        name: "  Acme Studio  ",
        slug: "  ACME-STUDIO  ",
      }),
    ).toEqual({
      description: "Help us choose.",
      name: "Acme Studio",
      slug: "acme-studio",
    });
  });

  it.each(["-acme", "acme-", "acme--studio", "acme studio", "acme_studio"])(
    "rejects an unsafe slug: %s",
    (slug) => {
      expect(
        projectSchema.safeParse({ description: "", name: "Acme", slug })
          .success,
      ).toBe(false);
    },
  );

  it("bounds persisted text fields", () => {
    const result = projectSchema.safeParse({
      description: "x".repeat(241),
      name: "x".repeat(81),
      slug: "valid-slug",
    });

    expect(result.success).toBe(false);
  });
});
