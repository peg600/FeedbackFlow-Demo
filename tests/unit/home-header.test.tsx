import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeHeader } from "@/features/auth/components/home-header";
import { I18nProvider } from "@/lib/i18n/client";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  refetch: vi.fn(),
  signOut: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: mocks.useSession, signOut: mocks.signOut },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

const session = { user: { id: "test-user", name: "Test User" }, session: { id: "test-session" } };

describe("HomeHeader account navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSession.mockReturnValue({
      data: null, isPending: false, isRefetching: false, error: null, refetch: mocks.refetch,
    });
    mocks.refetch.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue({ data: {}, error: null });
  });

  it("shows anonymous entry points without feature or pricing navigation", async () => {
    const user = userEvent.setup();
    render(<HomeHeader />);
    await user.click(screen.getByLabelText("Open navigation"));

    expect(screen.getByRole("link", { name: "FeedbackFlow home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Features" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pricing" })).not.toBeInTheDocument();
    for (const name of ["Primary navigation", "Mobile navigation"]) {
      const menu = within(screen.getByRole("navigation", { name }));
      expect(menu.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
      expect(menu.getByRole("link", { name: "About the maker" })).toHaveAttribute("href", "/profile");
      expect(menu.getByRole("link", { name: "Create your board" })).toHaveAttribute("href", "/register");
    }
  });

  it("keeps one signed-in exit outside the collapsible menus", async () => {
    const user = userEvent.setup();
    mocks.useSession.mockReturnValue({ data: session, isPending: false, error: null });
    render(<HomeHeader />);

    const exit = screen.getByRole("button", { name: "Sign out" });
    expect(exit.closest("nav")).toBeNull();
    expect(exit.closest("details")).toBeNull();
    expect(exit.parentElement?.parentElement?.lastElementChild).toBe(exit.parentElement);
    await user.click(screen.getByLabelText("Open navigation"));
    expect(screen.getAllByRole("button", { name: "Sign out" })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create your board" })).not.toBeInTheDocument();

    await user.click(exit);
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledWith("/login");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("does not flash anonymous controls while the session is unresolved", () => {
    mocks.useSession.mockReturnValue({ data: null, isPending: true, error: null });
    render(<HomeHeader />);

    expect(screen.getByRole("status", { name: "Loading account" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create your board" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FeedbackFlow home" })).toHaveAttribute("href", "/");
  });

  it("preserves the signed-in exit during background session refresh failures", () => {
    mocks.useSession.mockReturnValue({ data: session, isPending: false, isRefetching: true, error: { message: "private provider details" } });
    render(<HomeHeader />);

    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByText("private provider details")).not.toBeInTheDocument();
  });

  it("offers a safe retry instead of treating failed session reads as anonymous", async () => {
    const user = userEvent.setup();
    mocks.useSession.mockReturnValue({ data: null, isPending: false, error: { message: "private provider details" }, refetch: mocks.refetch });
    render(<HomeHeader />);

    expect(screen.getByRole("alert")).toHaveTextContent("Account status unavailable.");
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create your board" })).not.toBeInTheDocument();
    expect(screen.queryByText("private provider details")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("retains safe failure feedback when retry itself rejects", async () => {
    const user = userEvent.setup();
    mocks.useSession.mockReturnValue({ data: null, isPending: false, error: { message: "private details" }, refetch: mocks.refetch });
    mocks.refetch.mockRejectedValue(new Error("private retry details"));
    render(<HomeHeader />);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledOnce());
    expect(screen.getByRole("alert")).toHaveTextContent("Account status unavailable.");
    expect(screen.queryByText("private retry details")).not.toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("disables retry during an active session refetch", async () => {
    const user = userEvent.setup();
    mocks.useSession.mockReturnValue({ data: null, isPending: false, isRefetching: true, error: {}, refetch: mocks.refetch });
    render(<HomeHeader />);

    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toBeDisabled();
    await user.click(retry);
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it("keeps the user on the public home page and shows a safe error if sign out rejects", async () => {
    const user = userEvent.setup();
    mocks.useSession.mockReturnValue({ data: session, isPending: false, error: null });
    mocks.signOut.mockRejectedValue(new Error("private sign out details"));
    render(<HomeHeader />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to sign out. Try again.");
    expect(screen.queryByText("private sign out details")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("localizes signed-in controls and sign-out failures in Chinese", async () => {
    const user = userEvent.setup();
    mocks.useSession.mockReturnValue({ data: session, isPending: false, error: null });
    mocks.signOut.mockResolvedValue({ data: null, error: { message: "private provider details" } });
    render(<I18nProvider locale="zh"><HomeHeader /></I18nProvider>);

    expect(screen.getByRole("link", { name: "FeedbackFlow 首页" })).toHaveAttribute("href", "/");
    expect(within(screen.getByRole("navigation", { name: "主导航" })).getByRole("link", { name: "控制台" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "退出登录" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("无法退出登录，请重试。");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("localizes the unavailable account status and retry action in Chinese", () => {
    mocks.useSession.mockReturnValue({ data: null, isPending: false, error: {}, refetch: mocks.refetch });
    render(<I18nProvider locale="zh"><HomeHeader /></I18nProvider>);

    expect(screen.getByRole("alert")).toHaveTextContent("暂时无法读取登录状态。");
    expect(screen.getByRole("button", { name: "重试" })).toBeEnabled();
  });
});
