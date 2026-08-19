import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/(marketing)/page";

describe("HomePage", () => {
  it("renders the FeedbackFlow landing page at the root route", () => {
    render(<HomePage />);

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
    ).toHaveAttribute("href", "/login");
    expect(
      screen.queryByText("To get started, edit the page.tsx file."),
    ).not.toBeInTheDocument();
  });
});
