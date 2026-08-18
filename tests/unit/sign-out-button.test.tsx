import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignOutButton } from "@/features/auth/components/sign-out-button";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));

describe("SignOutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ data: {}, error: null });
  });

  it("signs out and navigates to login", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledWith("/login");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("shows an error when sign out fails", async () => {
    const user = userEvent.setup();
    mocks.signOut.mockResolvedValue({
      data: null,
      error: { message: "Sign out failed." },
    });
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign out failed.",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("disables the button and prevents duplicate requests while pending", async () => {
    const user = userEvent.setup();
    let resolveSignOut: ((value: { data: object; error: null }) => void) | undefined;
    mocks.signOut.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    render(<SignOutButton />);

    await user.dblClick(screen.getByRole("button", { name: "Sign out" }));

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Signing out..." }),
    ).toBeDisabled();

    resolveSignOut?.({ data: {}, error: null });
  });
});
