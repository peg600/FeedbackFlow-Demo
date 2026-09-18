import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectSettingsForm } from "@/features/projects/components/project-settings-form";

const mocks = vi.hoisted(() => ({ update: vi.fn(), push: vi.fn() }));
vi.mock("@/features/projects/actions/update-project", () => ({ updateProjectAction: mocks.update }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

const project = { name: "Acme", slug: "acme", description: "A public board.", isPublic: true };

describe("ProjectSettingsForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a database slug conflict on the field and clears it after editing", async () => {
    mocks.update.mockResolvedValue({ serverError: {
      code: "PROJECT_SLUG_TAKEN", message: "This public URL slug is already in use.", field: "slug", requestId: "r-1",
    } });
    const user = userEvent.setup();
    render(<ProjectSettingsForm project={project} />);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByLabelText("Public URL slug")).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText("Public URL slug")).toHaveAttribute("aria-describedby", "slug-error");
    expect(mocks.update).toHaveBeenCalledWith(project);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText("Description"), " More details.");
    expect(screen.getByLabelText("Public URL slug")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("This public URL slug is already in use.");
    await user.type(screen.getByLabelText("Public URL slug"), "-new");
    expect(screen.getByLabelText("Public URL slug")).not.toHaveAttribute("aria-invalid");
  });

  it("renders flattened field validation and successful saves", async () => {
    mocks.update.mockResolvedValueOnce({ validationErrors: { formErrors: [], fieldErrors: { name: ["Project name is required."] } } })
      .mockResolvedValueOnce({ data: { message: "Project settings saved." } });
    const user = userEvent.setup();
    render(<ProjectSettingsForm project={project} />);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Project name is required.")).toBeVisible();
    await user.type(screen.getByLabelText("Project name"), " Studio");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Project settings saved.")).toBeVisible();
  });

  it("handles transport failures without showing the thrown message", async () => {
    mocks.update.mockRejectedValue(new Error("internal transport details"));
    const user = userEvent.setup();
    render(<ProjectSettingsForm project={project} />);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Unable to reach the server. Check your connection and try again.")).toBeVisible();
    expect(screen.queryByText("internal transport details")).not.toBeInTheDocument();
  });

  it("returns expired sessions to login", async () => {
    mocks.update.mockResolvedValue({ serverError: { code: "UNAUTHENTICATED", message: "Sign in again.", requestId: "r-2" } });
    const user = userEvent.setup();
    render(<ProjectSettingsForm project={project} />);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/login?returnTo=/dashboard/settings"));
  });
});
