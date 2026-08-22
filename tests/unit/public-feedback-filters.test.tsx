import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicFeedbackFilters } from "@/features/feedback/components/public-feedback-filters";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/p/acme-studio",
  useRouter: () => ({ push: mocks.push }),
}));

describe("PublicFeedbackFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Figma-sized shared controls in the public board layout", () => {
    render(
      <PublicFeedbackFilters
        params={{ page: 1, search: "", sort: "votes", status: "all" }}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Search feedback" })).toHaveClass(
      "h-component-control",
      "bg-surface",
    );
    expect(screen.getByRole("combobox", { name: "Sort feedback" })).toHaveClass(
      "h-select-control",
      "whitespace-nowrap",
    );
    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveClass(
      "h-select-control",
      "whitespace-nowrap",
    );
  });

  it("keeps the board filters in the URL and uses Figma's vote-first default", async () => {
    const user = userEvent.setup();
    render(
      <PublicFeedbackFilters
        params={{ page: 2, search: "dark", sort: "votes", status: "all" }}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Filter by status" }));
    await user.click(screen.getByRole("option", { name: "Planned" }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/p/acme-studio?search=dark&status=planned",
    );
  });
});
