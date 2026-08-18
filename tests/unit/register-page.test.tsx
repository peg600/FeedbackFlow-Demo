import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RegisterPage from "@/app/(auth)/register/page";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signUpEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: { email: mocks.signUpEmail },
  },
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signUpEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("renders the Figma registration content", () => {
    render(<RegisterPage />);

    expect(
      screen.getByText("Start with one project. Ship the whole loop."),
    ).toBeInTheDocument();
    expect(screen.getByText("A public feedback board")).toBeInTheDocument();
    expect(
      screen.getByText("One account owns one focused product workspace."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "placeholder",
      "e.g. Paul Maker",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "placeholder",
      "Must be at least 8 characters",
    );
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("updates the password strength indicator", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const strength = screen.getByRole("progressbar", {
      name: "Password strength",
    });
    expect(strength).toHaveAttribute("aria-valuenow", "0");
    expect(strength).toHaveAttribute("aria-valuetext", "Not entered");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-describedby",
      "password-strength",
    );

    await user.type(screen.getByLabelText("Password"), "Feedback123!");

    expect(screen.getByText("Good")).toBeVisible();
    expect(strength).toHaveAttribute("aria-valuenow", "68");
    expect(strength).toHaveAttribute("aria-valuetext", "Good");
  });

  it("creates an account and navigates to onboarding", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Name"), "Paul");
    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(mocks.signUpEmail).toHaveBeenCalledWith({
      name: "Paul",
      email: "paul@example.com",
      password: "Feedback123!",
    });
    expect(mocks.push).toHaveBeenCalledWith("/onboarding");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("shows server errors and keeps the user on the form", async () => {
    const user = userEvent.setup();
    mocks.signUpEmail.mockResolvedValue({
      data: null,
      error: {
        code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
        message: "User already exists. Use another email.",
      },
    });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Name"), "Paul");
    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "User already exists. Use another email.",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("disables submission while account creation is pending", async () => {
    const user = userEvent.setup();
    let resolveSignUp: ((value: { data: object; error: null }) => void) | undefined;
    mocks.signUpEmail.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignUp = resolve;
        }),
    );
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Name"), "Paul");
    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    await user.dblClick(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(mocks.signUpEmail).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Creating account..." }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();

    resolveSignUp?.({ data: {}, error: null });
  });
});
