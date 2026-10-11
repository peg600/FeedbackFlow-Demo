import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false, isRefetching: false, error: null, refetch: vi.fn() }),
  },
}));

import HomePage from "@/app/(marketing)/page";

describe("HomePage", () => {
  it("renders the FeedbackFlow landing page at the root route", async () => {
    render(await HomePage());

    expect(screen.getByRole("link", { name: "FeedbackFlow home" })).toHaveAttribute("href", "/");
    const header = within(screen.getByRole("banner"));
    expect(header.queryByRole("link", { name: "Features" })).not.toBeInTheDocument();
    expect(header.queryByRole("link", { name: "Pricing" })).not.toBeInTheDocument();
    expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("group", { name: "Language / 语言" })).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(link).toHaveAttribute("href", "/dashboard");
    }

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Turn feedback into a roadmap customers trust.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Create your board" }),
    ).toSatisfy((links: HTMLElement[]) =>
      links.every((link) => link.getAttribute("href") === "/register"),
    );
    expect(
      screen.getByRole("link", { name: "View live demo" }),
    ).toHaveAttribute("href", "/p/demo");
    expect(
      screen.getByRole("heading", {
        name: "Everything needed for the feedback loop",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Start focused, grow when you need to",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "About the maker" }),
    ).toSatisfy((links: HTMLElement[]) =>
      links.every((link) => link.getAttribute("href") === "/profile"),
    );
    expect(
      screen.queryByText("To get started, edit the page.tsx file."),
    ).not.toBeInTheDocument();
  });
});
