import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/(marketing)/page";

describe("Landing page", () => {
  it("renders the starter heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /to get started, edit the page\.tsx file/i,
      }),
    ).toBeInTheDocument();
  });
});
