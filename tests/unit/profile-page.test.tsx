import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import ProfilePage from "@/app/profile/page";

describe("ProfilePage", () => {
  it("renders the portfolio sections and safe project links", async () => {
    render(await ProfilePage());
    expect(screen.getByRole("heading", { name: "Nanxuan Li" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About Me" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Technical Skills" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Work Experience" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Projects" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("8 years in frontend and full-stack development")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Xidian University" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Portrait of Nanxuan Li" })).toHaveAttribute("src", expect.stringContaining("li-nanxuan.png"));
    expect(screen.getByRole("link", { name: "pegpaul7@gmail.com" })).toHaveAttribute("href", "mailto:pegpaul7@gmail.com");
    expect(screen.queryByRole("link", { name: "peg600@sina.com" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+86 136 4128 5537" })).toHaveAttribute("href", "tel:+8613641285537");
    expect(screen.getByText("Remote work with companies worldwide, as a full-time employee or an independent contractor.")).toBeVisible();
    expect(screen.getByRole("link", { name: "FeedbackFlow home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /FeedbackFlow A feedback management/ })).toHaveAttribute(
      "href",
      "/p/demo",
    );
  });

  it("switches complete resume panels with pointer and keyboard navigation", async () => {
    const user = userEvent.setup();
    render(await ProfilePage());
    const workTab = screen.getByRole("tab", { name: "Work Experience" });
    const projectsTab = screen.getByRole("tab", { name: "Projects" });
    const workPanel = screen.getByRole("tabpanel", { name: "Work Experience" });
    expect(within(workPanel).getAllByRole("article")).toHaveLength(6);
    expect(within(workPanel).getByText("5. Participated in requirements reviews, led technical knowledge-sharing sessions, mentored new team members, and helped allocate tasks.")).toBeVisible();
    expect(within(workPanel).queryByText(/95%/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "China Guardian Internal Component Library" })).not.toBeInTheDocument();

    await user.click(projectsTab);
    const projectsPanel = screen.getByRole("tabpanel", { name: "Projects" });
    expect(projectsPanel).toHaveAttribute("aria-labelledby", projectsTab.id);
    expect(within(projectsPanel).getAllByRole("article")).toHaveLength(5);
    expect(within(projectsPanel).getByText("3. Built an abstract syntax tree (AST) transformation layer and a Vue single-file component (SFC) generator that converted the drag-and-drop editor's form JSON and form JavaScript into .vue files.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "China Guardian Auctions Co., Ltd." })).not.toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(workTab).toHaveFocus();
    expect(workTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Work Experience" })).toBeVisible();
    await user.keyboard("{End}");
    expect(projectsTab).toHaveFocus();
    expect(projectsTab).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Home}");
    expect(workTab).toHaveFocus();
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });
});
