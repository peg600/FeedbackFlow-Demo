import { describe, expect, it } from "vitest";

import { parseDashboardSearchParams } from "@/validators/dashboard";

describe("parseDashboardSearchParams", () => {
  it("trims and validates supported dashboard query values", () => {
    expect(
      parseDashboardSearchParams({
        page: "3",
        search: "  dark mode  ",
        sort: "votes",
        status: "planned",
      }),
    ).toEqual({ page: 3, search: "dark mode", sort: "votes", status: "planned" });
  });

  it("uses bounded defaults for invalid values", () => {
    expect(
      parseDashboardSearchParams({
        page: "10001",
        search: "x".repeat(121),
        sort: "popular",
        status: "deleted",
      }),
    ).toEqual({ page: 1, search: "", sort: "newest", status: "all" });
  });
});
