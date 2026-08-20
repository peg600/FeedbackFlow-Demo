import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingPage from "@/app/onboarding/page";

const mocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  getCurrentProjectAccess: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/server/services/project-access", () => ({
  getCurrentProjectAccess: mocks.getCurrentProjectAccess,
}));

vi.mock("@/features/projects/actions/create-project", () => ({
  createProjectAction: mocks.createProject,
}));

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createProject.mockResolvedValue({
      error: "Unable to create your workspace. Try again.",
      ok: false,
      requestId: "request-1",
    });
    mocks.getCurrentProjectAccess.mockResolvedValue({
      project: null,
      session: { user: { email: "owner@example.com", id: "user-1" } },
    });
  });

  it("renders the Figma workspace form and derives the slug from its name", async () => {
    const user = userEvent.setup();
    render(await OnboardingPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Create your product workspace",
      }),
    ).toBeVisible();
    expect(screen.getByText("Account created")).toBeVisible();

    await user.type(screen.getByLabelText("Project name"), "Acme Studio");
    expect(screen.getByLabelText("Public URL slug")).toHaveValue(
      "acme-studio",
    );
    expect(
      screen.getByLabelText("Public feedback URL preview"),
    ).toHaveTextContent("feedbackflow.app/p/acme-studio");
  });

  it("stops automatic slug updates after a manual edit", async () => {
    const user = userEvent.setup();
    render(await OnboardingPage());

    const name = screen.getByLabelText("Project name");
    const slug = screen.getByLabelText("Public URL slug");
    await user.type(name, "Acme");
    await user.clear(slug);
    await user.type(slug, "custom-url");
    await user.type(name, " Studio");

    expect(slug).toHaveValue("custom-url");
  });

  it("links client validation errors to invalid fields", async () => {
    const user = userEvent.setup();
    render(await OnboardingPage());

    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    const name = screen.getByLabelText("Project name");
    const slug = screen.getByLabelText("Public URL slug");
    expect(await screen.findByText("Project name is required.")).toBeVisible();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", "name-error");
    expect(slug).toHaveAttribute("aria-invalid", "true");
    expect(slug.getAttribute("aria-describedby")).toContain("slug-error");
    expect(mocks.createProject).not.toHaveBeenCalled();
  });

  it("clears a server slug error after the user edits the submitted value", async () => {
    const user = userEvent.setup();
    mocks.createProject.mockResolvedValueOnce({
      fieldErrors: { slug: "This public URL slug is already in use." },
      ok: false,
      requestId: "request-conflict",
    });
    render(await OnboardingPage());

    await user.type(screen.getByLabelText("Project name"), "Acme Studio");
    await user.type(
      screen.getByLabelText("Project description"),
      "A public feedback board.",
    );
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    const slug = screen.getByLabelText("Public URL slug");
    expect(
      await screen.findByText("This public URL slug is already in use."),
    ).toBeVisible();
    expect(slug).toHaveAttribute("aria-invalid", "true");

    await user.type(slug, "-new");

    expect(
      screen.queryByText("This public URL slug is already in use."),
    ).not.toBeInTheDocument();
    expect(slug).not.toHaveAttribute("aria-invalid");
  });

  it("does not bind an earlier server error to a new pending submission", async () => {
    const user = userEvent.setup();
    let resolveRetry:
      | ((value: { error: string; ok: false; requestId: string }) => void)
      | undefined;
    mocks.createProject
      .mockResolvedValueOnce({
        fieldErrors: { slug: "This public URL slug is already in use." },
        ok: false,
        requestId: "request-conflict",
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          }),
      );
    render(await OnboardingPage());

    await user.type(screen.getByLabelText("Project name"), "Acme Studio");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));
    expect(
      await screen.findByText("This public URL slug is already in use."),
    ).toBeVisible();

    const slug = screen.getByLabelText("Public URL slug");
    await user.type(slug, "-new");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(
      screen.getByRole("button", { name: "Creating workspace..." }),
    ).toBeDisabled();
    expect(
      screen.queryByText("This public URL slug is already in use."),
    ).not.toBeInTheDocument();
    expect(slug).not.toHaveAttribute("aria-invalid");

    resolveRetry?.({
      error: "Unable to create your workspace. Try again.",
      ok: false,
      requestId: "request-retry",
    });
  });

  it("preserves the route guards", async () => {
    mocks.getCurrentProjectAccess.mockResolvedValueOnce({
      project: null,
      session: null,
    });
    await OnboardingPage();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/login?returnTo=/onboarding",
    );

    mocks.getCurrentProjectAccess.mockResolvedValueOnce({
      project: { id: "project-1" },
      session: { user: { id: "user-1" } },
    });
    await OnboardingPage();
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
