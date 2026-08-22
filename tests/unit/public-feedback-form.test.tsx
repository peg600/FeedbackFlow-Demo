import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicFeedbackForm } from "@/features/feedback/components/public-feedback-form";

const mocks = vi.hoisted(() => ({ createPublicFeedbackAction: vi.fn() }));

vi.mock("@/features/feedback/actions/create-public-feedback", () => ({
  createPublicFeedbackAction: mocks.createPublicFeedbackAction,
}));

describe("PublicFeedbackForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createPublicFeedbackAction.mockResolvedValue({
      error: "Unable to submit feedback. Try again.",
      ok: false,
      requestId: "request-1",
    });
  });

  it("renders the Figma submit card and links invalid fields to their errors", async () => {
    const user = userEvent.setup();
    render(<PublicFeedbackForm slug="acme-studio" />);

    expect(screen.getByRole("heading", { name: "Submit feedback" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    const title = screen.getByLabelText("Title");
    const description = screen.getByLabelText("Details");
    expect(await screen.findByText("Title must be at least 3 characters.")).toBeVisible();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "feedback-title-error");
    expect(description).toHaveAttribute("aria-invalid", "true");
  });

  it("passes validated feedback and the scoped project slug to the action", async () => {
    const user = userEvent.setup();
    render(<PublicFeedbackForm slug="acme-studio" />);

    await user.type(screen.getByLabelText("Title"), "Dark mode for the dashboard");
    await user.type(
      screen.getByLabelText("Details"),
      "A comfortable theme for reviewing updates after hours.",
    );
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    await screen.findByText("Unable to submit feedback. Try again.");
    expect(mocks.createPublicFeedbackAction).toHaveBeenCalledWith(
      null,
      expect.any(FormData),
    );
    const formData = mocks.createPublicFeedbackAction.mock.calls[0]?.[1] as FormData;
    expect(Object.fromEntries(formData)).toEqual({
      description: "A comfortable theme for reviewing updates after hours.",
      slug: "acme-studio",
      title: "Dark mode for the dashboard",
    });
  });
});
