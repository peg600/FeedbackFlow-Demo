import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardFilters } from "@/features/dashboard/components/dashboard-filters";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: mocks.push }),
}));

describe("DashboardFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the responsive component-spec heights and non-wrapping selects", () => {
    render(
      <DashboardFilters
        params={{ page: 1, search: "", sort: "newest", status: "all" }}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Search feedback" })).toHaveClass(
      "h-[50px]",
      "md:h-[42px]",
      "lg:h-select-control",
    );
    expect(
      screen.getByRole("combobox", { name: "Filter by status" }).parentElement,
    ).toHaveClass(
      "lg:min-w-[106px]",
    );
    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveClass(
      "h-select-control",
      "whitespace-nowrap",
    );
    expect(
      screen.getByRole("combobox", { name: "Sort feedback" }).parentElement,
    ).toHaveClass(
      "lg:min-w-[100px]",
    );
    expect(screen.getByRole("combobox", { name: "Sort feedback" })).toHaveClass(
      "h-select-control",
      "whitespace-nowrap",
    );
  });

  it("submits changed select values through the dashboard URL", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFilters
        params={{ page: 1, search: "", sort: "newest", status: "all" }}
      />,
    );

    await user.click(
      screen.getByRole("combobox", { name: "Sort feedback" }),
    );
    await user.click(screen.getByRole("option", { name: "Most votes" }));

    expect(mocks.push).toHaveBeenCalledWith("/dashboard?sort=votes");
  });

  it("uses Figma check and status-dot assets in the status menu", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFilters
        params={{ page: 1, search: "", sort: "newest", status: "all" }}
      />,
    );

    await user.click(
      screen.getByRole("combobox", { name: "Filter by status" }),
    );

    expect(
      screen
        .getByRole("option", { name: "All status" })
        .querySelector('img[src="/icons/select-check.svg"]'),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("option", { name: "Planned" })
        .querySelector('img[src="/icons/select-status-planned.svg"]'),
    ).toBeInTheDocument();
  });
});
