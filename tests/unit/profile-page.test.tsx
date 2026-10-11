import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProfilePage from "@/app/profile/page";

describe("ProfilePage", () => {
  it("renders the portfolio sections and safe project links", async () => {
    render(await ProfilePage());
    expect(screen.getByRole("heading", { name: "Paul Li" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About Me" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tech Stack" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Featured Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("rel", "noreferrer");
    expect(screen.getByRole("link", { name: "FeedbackFlow home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /FeedbackFlow User feedback/ })).toHaveAttribute(
      "href",
      "/p/demo",
    );
  });
});
