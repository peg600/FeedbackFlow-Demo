import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import LoginPage from "@/app/(auth)/login/page";

describe("LoginPage", () => {
  it("renders the Figma login content and demo credentials", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("paul@example.com");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByText("demo@feedbackflow.app · Demo1234!")).toBeVisible();
  });

  it("links validation errors to invalid fields", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const email = screen.getByLabelText("Email");
    await user.clear(email);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is required.")).toBeVisible();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
  });
});
