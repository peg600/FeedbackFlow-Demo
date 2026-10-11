import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/lib/i18n/client";

const mocks = vi.hoisted(() => ({ roadmap: vi.fn(), board: vi.fn(), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/lib/i18n/server", async () => {
  const { createI18n } = await import("@/lib/i18n/shared");
  return { getI18n: async () => createI18n("zh") };
});
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/p/acme",
}));
vi.mock("@/features/feedback/server/roadmap", () => ({ getPublicRoadmap: mocks.roadmap }));
vi.mock("@/features/feedback/server/queries", () => ({ getPublicFeedbackBoard: mocks.board }));
vi.mock("@/features/feedback/actions/create-public-feedback", () => ({ createPublicFeedbackAction: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false, isRefetching: false, error: null, refetch: vi.fn() }),
  },
}));

import HomePage from "@/app/(marketing)/page";
import ProfilePage from "@/app/profile/page";
import RoadmapPage, { generateMetadata as roadmapMetadata } from "@/app/p/[slug]/roadmap/page";
import PublicFeedbackPage, { generateMetadata as boardMetadata } from "@/app/p/[slug]/page";
import PublicProjectNotFound from "@/app/p/[slug]/not-found";
import FeedbackDetailNotFound from "@/app/p/[slug]/feedback/[id]/not-found";
import PublicFeedbackError from "@/app/p/[slug]/error";
import FeedbackDetailError from "@/app/p/[slug]/feedback/[id]/error";
import PublicFeedbackLoading from "@/app/p/[slug]/loading";
import FeedbackDetailLoading from "@/app/p/[slug]/feedback/[id]/loading";

const project = { id: "p1", slug: "acme", name: "Welcome back", description: "Sign in" };
const params = Promise.resolve({ slug: "acme" });

describe("Chinese server-rendered pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.roadmap.mockResolvedValue({ project, lanes: [
      { status: "planned", total: 6, items: [{ id: "f1", title: "Welcome back", status: "planned", voteCount: 3, updatedAt: new Date("2026-10-11T00:00:00Z") }] },
      { status: "in_progress", total: 0, items: [] },
      { status: "completed", total: 0, items: [] },
    ] });
    mocks.board.mockResolvedValue({ project, totalPublicFeedback: 5,
      items: [{ id: "f1", title: "Welcome back", description: "Sign in", status: "planned", voteCount: 3 }],
      pagination: { page: 1, pageSize: 4, filteredCount: 5, totalPages: 2 },
    });
  });

  it.each([PublicFeedbackLoading, FeedbackDetailLoading])("keeps one shared Chinese header available while public resources load", async (Page) => {
    render(<I18nProvider locale="zh">{await Page()}</I18nProvider>);
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "FeedbackFlow 首页" })).toHaveAttribute("href", "/");
    for (const link of screen.getAllByRole("link", { name: "关于作者" })) {
      expect(link).toHaveAttribute("href", "/profile");
    }
    expect(screen.getByRole("group", { name: "Language / 语言" })).toBeVisible();
    expect(screen.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each([PublicProjectNotFound, FeedbackDetailNotFound])("keeps language selection available on missing public resources", async (Page) => {
    render(<I18nProvider locale="zh">{await Page()}</I18nProvider>);
    expect(screen.getByRole("group", { name: "Language / 语言" })).toBeVisible();
    expect(screen.getByRole("link", { name: "FeedbackFlow 首页" })).toHaveAttribute("href", "/");
    for (const link of screen.getAllByRole("link", { name: "关于作者" })) {
      expect(link).toHaveAttribute("href", "/profile");
    }
    expect(screen.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each([PublicFeedbackError, FeedbackDetailError])("keeps language selection and retry available when public reads fail", (Page) => {
    render(<I18nProvider locale="zh"><Page reset={vi.fn()} /></I18nProvider>);
    expect(screen.getByRole("group", { name: "Language / 语言" })).toBeVisible();
    expect(screen.getByRole("link", { name: "FeedbackFlow 首页" })).toHaveAttribute("href", "/");
    for (const link of screen.getAllByRole("link", { name: "关于作者" })) {
      expect(link).toHaveAttribute("href", "/profile");
    }
    expect(screen.getByRole("button", { name: "重试" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("暂时不可用");
  });

  it("renders natural Chinese landing and localized navigation labels", async () => {
    render(<I18nProvider locale="zh">{await HomePage()}</I18nProvider>);
    expect(screen.getByRole("heading", { level: 1, name: "让用户反馈成为值得信赖的产品路线图。" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FeedbackFlow 首页" })).toHaveAttribute("href", "/");
  });

  it("localizes profile sections while preserving names and links", async () => {
    render(<I18nProvider locale="zh">{await ProfilePage()}</I18nProvider>);
    expect(screen.getByRole("heading", { level: 1, name: "Paul Li" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "关于我" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FeedbackFlow 首页" })).toHaveAttribute("href", "/");
    for (const link of screen.getAllByRole("link", { name: "关于作者" })) {
      expect(link).toHaveAttribute("href", "/profile");
      expect(link).toHaveAttribute("aria-current", "page");
    }
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/peg600");
  });

  it("localizes roadmap state, counts and empty lanes while preserving user titles and filter URLs", async () => {
    render(<I18nProvider locale="zh">{await RoadmapPage({ params })}</I18nProvider>);
    expect(screen.getByRole("heading", { name: /^已计划$/ })).toBeVisible();
    expect(screen.getByText("6 条")).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "Welcome back" })).toBeVisible();
    expect(screen.getByRole("link", { name: "查看全部已计划反馈" })).toHaveAttribute("href", "/p/acme?status=planned&sort=votes");
    expect(screen.getAllByText(/暂无.*反馈/)).toHaveLength(2);
    expect((await roadmapMetadata({ params })).title).toContain("Welcome back");
  });

  it("preserves public feedback content and pagination parameters in Chinese", async () => {
    render(<I18nProvider locale="zh">{await PublicFeedbackPage({ params, searchParams: Promise.resolve({ search: "Welcome back", sort: "newest", status: "planned" }) })}</I18nProvider>);
    expect(screen.getByRole("heading", { level: 1, name: "你希望我们接下来做什么？" })).toBeVisible();
    expect(screen.getByText("5 条公开反馈")).toBeVisible();
    expect(screen.getByRole("link", { name: /Welcome back.*Sign in.*已计划/ })).toHaveAttribute("href", "/p/acme/feedback/f1");
    expect(screen.getByRole("link", { name: "下一页" })).toHaveAttribute("href", "/p/acme?search=Welcome+back&sort=newest&status=planned&page=2");
    expect(await boardMetadata({ params })).toMatchObject({ description: "Sign in", title: expect.stringContaining("Welcome back") });
  });

  it("retains not-found behavior for private or missing public resources", async () => {
    mocks.roadmap.mockResolvedValue(null);
    mocks.board.mockResolvedValue(null);
    await expect(RoadmapPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(PublicFeedbackPage({ params, searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
