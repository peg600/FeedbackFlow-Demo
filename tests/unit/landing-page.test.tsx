import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/lib/i18n/client";

const mocks = vi.hoisted(() => ({ useSession: vi.fn() }));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: mocks.useSession,
  },
}));

import HomePage from "@/app/(marketing)/page";

describe("HomePage", () => {
  beforeEach(() => {
    sessionStorage.setItem("feedbackflow-demo-guide-dismissed-v1", "1");
    mocks.useSession.mockReturnValue({
      data: null, isPending: false, isRefetching: false, error: null, refetch: vi.fn(),
    });
  });

  it("renders the FeedbackFlow landing page at the root route", async () => {
    render(await HomePage());

    expect(screen.getByRole("link", { name: "FeedbackFlow home" })).toHaveAttribute("href", "/");
    const header = within(screen.getByRole("banner"));
    expect(header.queryByRole("link", { name: "Features" })).not.toBeInTheDocument();
    expect(header.queryByRole("link", { name: "Pricing" })).not.toBeInTheDocument();
    expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("group", { name: "Language / 语言" })).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(link).toHaveAttribute("href", "/dashboard");
    }

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Turn feedback into a roadmap customers trust.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Create your board" }),
    ).toSatisfy((links: HTMLElement[]) =>
      links.every((link) => link.getAttribute("href") === "/register"),
    );
    expect(
      screen.getByRole("link", { name: "View live demo" }),
    ).toHaveAttribute("href", "/p/demo");
    expect(
      screen.getByRole("heading", {
        name: "Everything needed for the feedback loop",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Start focused, grow when you need to",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "About the maker" }),
    ).toSatisfy((links: HTMLElement[]) =>
      links.every((link) => link.getAttribute("href") === "/profile"),
    );
    expect(
      screen.queryByText("To get started, edit the page.tsx file."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Try Pro in sandbox" })).toHaveAttribute("href", "/login?returnTo=/dashboard/billing");
  });

  it("routes every owner CTA to the workspace or billing after sign-in", async () => {
    const view = render(await HomePage());
    mocks.useSession.mockReturnValue({ data: { user: { id: "owner" } }, isPending: false, error: null });
    view.rerender(await HomePage());

    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getAllByRole("link").some((link) => /^\/(register|login)/.test(link.getAttribute("href") ?? ""))).toBe(false);
    const main = within(screen.getByRole("main"));
    expect(main.getAllByRole("link", { name: "Dashboard" })).toHaveLength(3);
    for (const link of main.getAllByRole("link", { name: "Dashboard" })) {
      expect(link).toHaveAttribute("href", "/dashboard");
    }
    expect(main.getByRole("link", { name: "Billing" })).toHaveAttribute("href", "/dashboard/billing");
    expect(main.getByRole("link", { name: "View live demo" })).toHaveAttribute("href", "/p/demo");

    mocks.useSession.mockReturnValue({ data: null, isPending: false, error: null });
    view.rerender(await HomePage());
    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Try Pro in sandbox" })).toHaveAttribute("href", "/login?returnTo=/dashboard/billing");
  });

  it.each([
    { isPending: true, error: null },
    { isPending: false, error: new Error("Private provider details") },
  ])("uses server-protected destinations while identity is unknown: $isPending", async (state) => {
    mocks.useSession.mockReturnValue({ data: null, ...state });
    render(await HomePage());

    const main = within(screen.getByRole("main"));
    expect(main.queryByRole("link", { name: "Create your board" })).not.toBeInTheDocument();
    expect(main.queryByRole("link", { name: "Start free" })).not.toBeInTheDocument();
    const actions = main.getAllByRole("link", { name: "Dashboard" });
    expect(actions).toHaveLength(4);
    for (const link of actions) expect(link).toHaveAttribute("href", "/dashboard");
    expect(main.queryByRole("link", { name: "Billing" })).not.toBeInTheDocument();
    expect(screen.queryByText("Private provider details")).not.toBeInTheDocument();
  });

  it("localizes signed-in workspace and billing actions", async () => {
    mocks.useSession.mockReturnValue({ data: { user: { id: "owner" } }, isPending: false, error: null });
    render(<I18nProvider locale="zh">{await HomePage()}</I18nProvider>);

    const main = within(screen.getByRole("main"));
    expect(main.getAllByRole("link", { name: "控制台" })).toHaveLength(3);
    expect(main.getByRole("link", { name: "订阅与账单" })).toHaveAttribute("href", "/dashboard/billing");
  });
});
