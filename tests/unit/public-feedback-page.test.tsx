import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicFeedbackPage, {
  generateMetadata,
} from "@/app/p/[slug]/page";

const mocks = vi.hoisted(() => ({
  getPublicFeedbackBoard: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  usePathname: () => "/p/acme-studio",
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/server/services/public-feedback", () => ({
  getPublicFeedbackBoard: mocks.getPublicFeedbackBoard,
}));
vi.mock("@/features/feedback/actions/create-public-feedback", () => ({
  createPublicFeedbackAction: vi.fn(),
}));

const params = Promise.resolve({ slug: "acme-studio" });
const searchParams = Promise.resolve({});
const board = {
  items: [
    {
      description: "A comfortable dark theme for late-night planning.",
      id: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
      status: "planned",
      title: "Dark mode for the dashboard",
      voteCount: 82,
    },
  ],
  pagination: {
    filteredCount: 5,
    page: 1,
    pageSize: 4,
    totalPages: 2,
  },
  project: {
    description: "Help us build a better product",
    id: "project-1",
    name: "Acme Studio",
    slug: "acme-studio",
  },
  totalPublicFeedback: 5,
};

describe("PublicFeedbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicFeedbackBoard.mockResolvedValue(board);
  });

  it("renders the Figma public board and provides feedback-detail links", async () => {
    render(await PublicFeedbackPage({ params, searchParams }));

    expect(
      screen.getByRole("heading", { name: "What should we build next?" }),
    ).toBeVisible();
    expect(screen.getByText("5 public feedback")).toBeVisible();
    expect(screen.getByText("Filters are saved in the URL")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Dark mode for the dashboard/i }),
    ).toHaveAttribute(
      "href",
      "/p/acme-studio/feedback/c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
    );
    expect(
      screen.queryByRole("link", { name: "Submit feedback" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/p/acme-studio?page=2",
    );
  });

  it("uses the project name and description in page metadata", async () => {
    await expect(generateMetadata({ params })).resolves.toMatchObject({
      description: "Help us build a better product",
      title: "Acme Studio feedback",
    });
  });

  it("uses a scoped empty state for an existing public project", async () => {
    mocks.getPublicFeedbackBoard.mockResolvedValueOnce({
      ...board,
      items: [],
      pagination: { ...board.pagination, filteredCount: 0, totalPages: 1 },
    });

    render(
      await PublicFeedbackPage({
        params,
        searchParams: Promise.resolve({ search: "missing" }),
      }),
    );

    expect(screen.getByText("No public feedback matches these filters")).toBeVisible();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/p/acme-studio",
    );
  });

  it("does not reveal missing or private projects", async () => {
    mocks.getPublicFeedbackBoard.mockResolvedValueOnce(null);

    await expect(PublicFeedbackPage({ params, searchParams })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});
