import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/components/site-header";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { I18nProvider } from "@/lib/i18n/client";

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/settings",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: mocks.signOut } }));

describe("SiteHeader", () => {
  it.each([
    { locale: "en", home: "FeedbackFlow home", profile: "About the maker", selected: "English" },
    { locale: "zh", home: "FeedbackFlow 首页", profile: "关于作者", selected: "中文" },
  ] as const)("provides the shared home, maker and language controls in $locale", ({ locale, home, profile, selected }) => {
    render(<I18nProvider locale={locale}><SiteHeader locale={locale} profileActive /></I18nProvider>);

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: home })).toHaveAttribute("href", "/");
    expect(within(header).getByText("FeedbackFlow")).toBeInTheDocument();
    for (const link of within(header).getAllByRole("link", { name: profile })) {
      expect(link).toHaveAttribute("href", "/profile");
      expect(link).toHaveAttribute("aria-current", "page");
    }
    expect(within(header).getAllByRole("group", { name: "Language / 语言" })).toHaveLength(1);
    expect(within(header).getByRole("button", { name: selected })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps business destinations, active state and actions consistent in both menus", async () => {
    const user = userEvent.setup();
    render(<SiteHeader navigation={[
      { href: "/p/demo", label: "Feedback", active: true },
      { href: "/p/demo/roadmap", label: "Roadmap" },
    ]} action={<button type="button">Sign out</button>} />);

    await user.click(screen.getByLabelText("Open navigation"));
    const desktop = screen.getByRole("navigation", { name: "Primary navigation" });
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    for (const menu of [desktop, mobile]) {
      expect(within(menu).getByRole("link", { name: "Feedback" })).toHaveAttribute("href", "/p/demo");
      expect(within(menu).getByRole("link", { name: "Feedback" })).toHaveAttribute("aria-current", "page");
      expect(within(menu).getByRole("link", { name: "Roadmap" })).toHaveAttribute("href", "/p/demo/roadmap");
      expect(within(menu).getByRole("link", { name: "Roadmap" })).not.toHaveAttribute("aria-current");
      expect(within(menu).getByRole("link", { name: "About the maker" })).toHaveAttribute("href", "/profile");
      expect(within(menu).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    }
  });

  it("supports dashboard mobile destinations without adding them to the desktop menu", async () => {
    const user = userEvent.setup();
    const publicBoard = { href: "/p/demo", label: "Public board" };
    render(<SiteHeader navigation={[publicBoard]} mobileNavigation={[
      publicBoard,
      { href: "/dashboard", label: "Overview", active: true },
      { href: "/dashboard/settings", label: "Project settings" },
      { href: "/dashboard/billing", label: "Billing" },
    ]} />);

    await user.click(screen.getByLabelText("Open navigation"));
    const desktop = screen.getByRole("navigation", { name: "Primary navigation" });
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(desktop).queryByRole("link", { name: "Project settings" })).not.toBeInTheDocument();
    expect(within(mobile).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(within(mobile).getByRole("link", { name: "Project settings" })).toHaveAttribute("href", "/dashboard/settings");
    expect(within(mobile).getByRole("link", { name: "Billing" })).toHaveAttribute("href", "/dashboard/billing");
  });

  it("closes the mobile menu after choosing a destination and restores keyboard focus on Escape", async () => {
    const user = userEvent.setup();
    render(<SiteHeader navigation={[{ href: "#features", label: "Features" }]} />);
    const trigger = screen.getByLabelText("Open navigation");
    const details = trigger.closest("details");

    await user.click(trigger);
    expect(details).toHaveAttribute("open");
    await user.click(within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("link", { name: "Features" }));
    expect(details).not.toHaveAttribute("open");

    await user.click(trigger);
    within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("link", { name: "About the maker" }).focus();
    await user.keyboard("{Escape}");
    expect(details).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
  });
});

describe("DashboardShell shared navigation", () => {
  it("renders one site header and retains workspace navigation and content", async () => {
    const user = userEvent.setup();
    render(<DashboardShell project={{ name: "My product", slug: "my-product" }} user={{ name: "Maker", email: "maker@example.com" }}>
      <main><h1>Project settings</h1></main>
    </DashboardShell>);

    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "FeedbackFlow home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { name: "Project settings" })).toBeInTheDocument();
    const sidebar = screen.getByRole("navigation", { name: "Dashboard navigation" });
    expect(within(sidebar).getByRole("link", { name: "Project settings" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByLabelText("Open navigation"));
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(mobile).getByRole("link", { name: "Project settings" })).toHaveAttribute("aria-current", "page");
    expect(within(mobile).getByRole("link", { name: "Feedback" })).toHaveAttribute("href", "/p/my-product");
    expect(within(mobile).getByRole("link", { name: "Roadmap" })).toHaveAttribute("href", "/p/my-product/roadmap");
    expect(within(mobile).getByRole("link", { name: "About the maker" })).toHaveAttribute("href", "/profile");
  });

  it("keeps a failed mobile sign-out visible and the home and maker destinations available", async () => {
    const user = userEvent.setup();
    mocks.signOut.mockRejectedValueOnce(new Error("Private provider details"));
    render(<DashboardShell project={{ name: "My product", slug: "my-product" }} user={{ name: "Maker", email: "maker@example.com" }}><main /></DashboardShell>);
    await user.click(screen.getByLabelText("Open navigation"));
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    await user.click(within(mobile).getByRole("button", { name: "Sign out" }));

    const alert = await within(mobile).findByRole("alert");
    expect(alert).toBeVisible();
    expect(alert).not.toHaveTextContent("Private provider details");
    expect(mobile.closest("details")).toHaveAttribute("open");
    expect(within(mobile).getByRole("link", { name: "About the maker" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "FeedbackFlow home" })).toHaveAttribute("href", "/");
  });
});
