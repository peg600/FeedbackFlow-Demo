import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProfilePage from "@/app/profile/page";

describe("ProfilePage", () => {
  it("renders the portfolio sections and safe project links", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: "Paul Li" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About Me" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tech Stack" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Featured Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("rel", "noreferrer");
    expect(screen.getByRole("link", { name: /FeedbackFlow/ })).toHaveAttribute(
      "href",
      "/p/demo",
    );
  });
});
