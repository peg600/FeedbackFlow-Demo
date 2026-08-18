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

  it("validates matching passwords", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Name"), "Paul");
    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    await user.type(screen.getByLabelText("Confirm password"), "Different123!");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const confirmation = screen.getByLabelText("Confirm password");
    expect(await screen.findByText("Passwords do not match.")).toBeVisible();
    expect(confirmation).toHaveAttribute("aria-invalid", "true");
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("creates an account and navigates to onboarding", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Name"), "Paul");
    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    await user.type(screen.getByLabelText("Confirm password"), "Feedback123!");
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
      error: { message: "Email is already in use." },
    });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Name"), "Paul");
    await user.type(screen.getByLabelText("Email"), "paul@example.com");
    await user.type(screen.getByLabelText("Password"), "Feedback123!");
    await user.type(screen.getByLabelText("Confirm password"), "Feedback123!");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to create your account. Check your details and try again.",
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
    await user.type(
      screen.getByLabelText("Confirm password"),
      "Feedback123!",
    );
    await user.dblClick(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(mocks.signUpEmail).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Creating account..." }),
    ).toBeDisabled();

    resolveSignUp?.({ data: {}, error: null });
  });
});
