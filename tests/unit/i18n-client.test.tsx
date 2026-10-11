import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "@/features/auth/components/login-form";
import { I18nProvider, useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE } from "@/lib/i18n/shared";

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), signIn: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: mocks.signIn } } }));

function LocalizedContent() {
  const { t } = useI18n();
  return <><LanguageSwitcher /><h1>{t("Welcome back")}</h1><input aria-label="Draft" defaultValue="My feedback" /></>;
}

describe("language switcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = `${LOCALE_COOKIE}=; Max-Age=0; Path=/`;
    document.documentElement.lang = "en";
    window.history.replaceState({}, "", "/login?returnTo=%2Fdashboard%3Fstatus%3Dplanned#form");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = `${LOCALE_COOKIE}=; Max-Age=0; Path=/`;
  });

  it("switches immediately, persists one year, preserves draft and URL, and refreshes server content", async () => {
    const user = userEvent.setup();
    const cookieWrite = vi.spyOn(document, "cookie", "set");
    render(<I18nProvider locale="en"><LocalizedContent /></I18nProvider>);
    const initialUrl = window.location.href;
    await user.type(screen.getByLabelText("Draft"), " in progress");
    expect(screen.getByRole("group", { name: "Language / 语言" })).toBeVisible();
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "中文" }));

    expect(screen.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
    expect(screen.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false");
    expect(cookieWrite).toHaveBeenCalledWith(`${LOCALE_COOKIE}=zh; Path=/; Max-Age=31536000; SameSite=Lax`);
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=zh`);
    expect(document.documentElement).toHaveAttribute("lang", "zh-CN");
    expect(screen.getByLabelText("Draft")).toHaveValue("My feedback in progress");
    expect(window.location.href).toBe(initialUrl);
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=en`);
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });

  it("does not refresh or write cookies when selecting the current language", async () => {
    const user = userEvent.setup();
    const cookieWrite = vi.spyOn(document, "cookie", "set");
    render(<I18nProvider locale="zh"><LocalizedContent /></I18nProvider>);
    await user.click(screen.getByRole("button", { name: "中文" }));
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(cookieWrite).not.toHaveBeenCalled();
  });

  it("uses updated server locale props after navigation", () => {
    const { rerender } = render(<I18nProvider locale="en"><LocalizedContent /></I18nProvider>);
    rerender(<I18nProvider locale="zh"><LocalizedContent /></I18nProvider>);
    expect(screen.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });
});

describe("Chinese login failure feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Chinese validation and links it accessibly to the invalid field", async () => {
    const user = userEvent.setup();
    render(<I18nProvider locale="zh"><LoginForm /></I18nProvider>);
    await user.click(screen.getByRole("button", { name: "登录" }));
    const email = screen.getByLabelText("邮箱");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(document.getElementById("email-error")).toHaveTextContent(/邮箱/);
    expect(document.getElementById("email-error")).not.toHaveTextContent("Email is required.");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("localizes safe unknown authentication failures without exposing provider details", async () => {
    const user = userEvent.setup();
    mocks.signIn.mockResolvedValue({ error: { code: "INTERNAL_SERVER_ERROR", message: "private database details" } });
    render(<I18nProvider locale="zh"><LoginForm /></I18nProvider>);
    await user.type(screen.getByLabelText("邮箱"), "tester@example.com");
    await user.type(screen.getByLabelText("密码"), "ValidPassword123!");
    await user.click(screen.getByRole("button", { name: "登录" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/[\u4e00-\u9fff]/);
    expect(alert).not.toHaveTextContent("private database details");
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
