import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DemoGuide } from "@/app/(marketing)/demo-guide";
import { I18nProvider } from "@/lib/i18n/client";

describe("DemoGuide", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });

  it("introduces the workflow, technologies, and existing destinations on the first visit", async () => {
    const user = userEvent.setup();
    render(<DemoGuide />);
    const dialog = await screen.findByRole("dialog", { name: "Welcome to FeedbackFlow" });
    expect(within(dialog).getByRole("heading", { name: "Welcome to FeedbackFlow" })).toHaveFocus();
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(4);
    expect(within(dialog).getByText(/Free projects can collect up to 3 feedback items/)).toBeVisible();
    expect(within(dialog).getByText(/No real money is charged/)).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Explore the feedback board" })).toHaveAttribute("href", "/p/demo");
    expect(within(dialog).getByRole("link", { name: "Try the dashboard" })).toHaveAttribute("href", "/dashboard");
    await user.click(within(dialog).getByText("Under the hood · Technology stack"));
    expect(within(dialog).getByText(/Neon PostgreSQL/)).toBeVisible();
    expect(within(dialog).getByText(/Paddle Sandbox · Vercel/)).toBeVisible();
  });

  it("closes with Escape, restores focus, remembers dismissal, and can reopen", async () => {
    const user = userEvent.setup();
    const view = render(<DemoGuide />);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Demo guide" })).toHaveFocus();
    view.unmount();
    render(<DemoGuide />);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Demo guide" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Close guide" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("remembers dismissal when following an experience link", async () => {
    const user = userEvent.setup();
    const view = render(<DemoGuide />);
    const dialog = await screen.findByRole("dialog");
    const link = within(dialog).getByRole("link", { name: "Explore the feedback board" });
    document.addEventListener("click", (event) => event.preventDefault(), { once: true });
    await user.click(link);
    expect(sessionStorage.getItem("feedbackflow-demo-guide-dismissed-v1")).toBe("1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    view.unmount();
  });

  it("switches languages inside the modal without closing it", async () => {
    const user = userEvent.setup();
    render(<I18nProvider locale="zh"><DemoGuide /></I18nProvider>);
    const dialog = await screen.findByRole("dialog", { name: "欢迎体验 FeedbackFlow" });
    expect(within(dialog).getByText(/免费项目最多收集 3 条反馈/)).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "English" }));
    expect(screen.getByRole("dialog", { name: "Welcome to FeedbackFlow" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Try the dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("still opens and closes when browser storage is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage disabled"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage disabled"); });
    render(<DemoGuide />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close guide" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Demo guide" }));
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});
