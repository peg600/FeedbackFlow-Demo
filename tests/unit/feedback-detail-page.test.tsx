import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FeedbackDetailPage, {
  generateMetadata,
} from "@/app/p/[slug]/feedback/[id]/page";

const mocks = vi.hoisted(() => ({
  getPublicFeedbackDetail: vi.fn(),
  getPublicFeedbackVoteState: vi.fn(),
  getSession: vi.fn(),
  headers: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock("@/server/services/public-feedback", () => ({
  getPublicFeedbackDetail: mocks.getPublicFeedbackDetail,
  getPublicFeedbackVoteState: mocks.getPublicFeedbackVoteState,
}));
vi.mock("@/features/feedback/actions/vote-feedback", () => ({
  voteFeedbackAction: vi.fn(),
}));

const params = Promise.resolve({
  id: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  slug: "acme-studio",
});

const item = {
  authorName: "Maya Chen",
  createdAt: new Date("2026-08-18T12:00:00.000Z"),
  description: "A comfortable theme for customers who review updates after hours.",
  id: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  projectDescription: "Help us build a better product",
  projectName: "Acme Studio",
  projectSlug: "acme-studio",
  status: "planned",
  title: "Dark mode for the dashboard",
  updatedAt: new Date("2026-08-19T12:00:00.000Z"),
  voteCount: 82,
};

describe("FeedbackDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getPublicFeedbackDetail.mockResolvedValue(item);
    mocks.getPublicFeedbackVoteState.mockResolvedValue(false);
    mocks.getSession.mockResolvedValue(null);
  });

  it("renders the Figma public feedback detail and scoped project links", async () => {
    render(await FeedbackDetailPage({ params }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Dark mode for the dashboard",
      }),
    ).toBeVisible();
    expect(screen.getByText("Roadmap status")).toBeVisible();
    expect(screen.getByText("Have more feedback?")).toBeVisible();
    expect(screen.getByRole("link", { name: "View roadmap" })).toHaveAttribute(
      "href",
      "/p/acme-studio/roadmap",
    );
    expect(screen.getByRole("link", { name: "Submit feedback" })).toHaveAttribute(
      "href",
      "/p/acme-studio#submit-feedback",
    );
    expect(mocks.getPublicFeedbackDetail).toHaveBeenCalledWith(
      "acme-studio",
      "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
    );
  });

  it("uses the feedback data for public metadata", async () => {
    await expect(generateMetadata({ params })).resolves.toMatchObject({
      description: item.description,
      title: "Dark mode for the dashboard | Acme Studio",
    });
  });

  it("rejects a missing or private feedback item", async () => {
    mocks.getPublicFeedbackDetail.mockResolvedValueOnce(null);

    await expect(FeedbackDetailPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
