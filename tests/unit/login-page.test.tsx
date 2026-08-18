import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "@/app/(auth)/login/page";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: mocks.signInEmail },
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("renders the Figma login content and demo credentials", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("");
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

  it("signs in with the remember preference and navigates", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    await user.click(screen.getByRole("checkbox", { name: "Remember me" }));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mocks.signInEmail).toHaveBeenCalledWith({
      email: "paul@example.com",
      password: "Feedback123!",
      rememberMe: true,
    });
    expect(mocks.push).toHaveBeenCalledWith("/dashboard");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("shows authentication errors without navigating", async () => {
    const user = userEvent.setup();
    mocks.signInEmail.mockResolvedValue({
      data: null,
      error: { message: "Invalid email or password." },
    });
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to sign in. Check your credentials and try again.",
    );
    expect(mocks.signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ rememberMe: false }),
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("disables submission while the request is pending", async () => {
    const user = userEvent.setup();
    let resolveSignIn: ((value: { data: object; error: null }) => void) | undefined;
    mocks.signInEmail.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    const button = screen.getByRole("button", { name: "Sign in" });
    await user.dblClick(button);

    expect(mocks.signInEmail).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();

    resolveSignIn?.({ data: {}, error: null });
  });
});
