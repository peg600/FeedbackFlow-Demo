import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";

describe("Not found page", () => {
  it("offers routes back to the homepage and dashboard", () => {
    const { container } = render(<NotFound />);

    expect(
      container.querySelector('img[src="/icons/logo-mark.svg"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /this page took a wrong turn/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the link may be outdated, moved, or deleted/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to homepage/i }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: /open dashboard/i }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
