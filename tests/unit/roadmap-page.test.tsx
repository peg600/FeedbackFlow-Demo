import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/public-roadmap", () => ({
  getPublicRoadmap: vi.fn().mockResolvedValue({
    project: { description: "Ideas", id: "p1", name: "Acme", slug: "acme" },
    lanes: [
      { status: "planned", items: [{ id: "f1", status: "planned", title: "Dark mode", updatedAt: new Date("2026-01-02"), voteCount: 3 }] },
      { status: "in_progress", items: [] },
      { status: "completed", items: [] },
    ],
  }),
}));

import RoadmapPage from "@/app/p/[slug]/roadmap/page";

describe("RoadmapPage", () => {
  it("renders all derived status lanes and empty states", async () => {
    render(await RoadmapPage({ params: Promise.resolve({ slug: "acme" }) }));
    expect(screen.getByRole("heading", { name: "Planned" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "In progress" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completed" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dark mode/ })).toHaveAttribute("href", "/p/acme/feedback/f1");
    expect(screen.getAllByText(/items yet/)).toHaveLength(2);
  });
});
