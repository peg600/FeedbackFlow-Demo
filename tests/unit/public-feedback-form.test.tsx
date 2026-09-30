import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicFeedbackForm } from "@/features/feedback/components/public-feedback-form";

const mocks = vi.hoisted(() => ({ createPublicFeedbackAction: vi.fn(), push: vi.fn() }));

vi.mock("@/features/feedback/actions/create-public-feedback", () => ({
  createPublicFeedbackAction: mocks.createPublicFeedbackAction,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("PublicFeedbackForm", () => {
  it.each(["server", "network"])("shows a %s failure even after editing while the request is pending", async (kind) => {
    const pending = Promise.withResolvers<unknown>();
    mocks.createPublicFeedbackAction.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<PublicFeedbackForm slug="acme-studio" />);
    await user.type(screen.getByLabelText("Title"), "Dark mode");
    await user.type(screen.getByLabelText("Details"), "Please add a dark theme.");
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    await user.type(screen.getByLabelText("Title"), " please");
    await act(async () => {
      if (kind === "network") pending.reject(new Error("private transport detail"));
      else pending.resolve({ serverError: { code: "INTERNAL_ERROR", message: "Unable to submit feedback. Try again.", requestId: "r" } });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(kind === "network" ? "Unable to reach the server" : "Unable to submit feedback");
    expect(screen.queryByText("private transport detail")).not.toBeInTheDocument();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createPublicFeedbackAction.mockResolvedValue({
      serverError: { code: "INTERNAL_ERROR", message: "Unable to submit feedback. Try again.", requestId: "request-1" },
    });
  });

  it("shows quota errors and handles an expired session", async () => {
    mocks.createPublicFeedbackAction.mockResolvedValueOnce({ serverError: {
      code: "FEEDBACK_LIMIT_REACHED", message: "This board has reached the Free limit of 3 feedback items. Ask the project owner to upgrade to Pro for unlimited feedback.", requestId: "r-1",
    } }).mockResolvedValueOnce({ serverError: { code: "UNAUTHENTICATED", message: "Sign in again.", requestId: "r-2" } });
    const user = userEvent.setup();
    render(<PublicFeedbackForm slug="acme-studio" />);
    await user.type(screen.getByLabelText("Title"), "Dark mode");
    await user.type(screen.getByLabelText("Details"), "Please add a dark theme.");
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(await screen.findByText("This board has reached the Free limit of 3 feedback items. Ask the project owner to upgrade to Pro for unlimited feedback.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByText("Sign in again.");
    expect(mocks.push).toHaveBeenCalledWith("/login?returnTo=%2Fp%2Facme-studio");
  });

  it("associates server validation with the submitted field", async () => {
    mocks.createPublicFeedbackAction.mockResolvedValue({ validationErrors: {
      formErrors: [], fieldErrors: { title: ["Choose a different title."] },
    } });
    const user = userEvent.setup();
    render(<PublicFeedbackForm slug="acme-studio" />);
    await user.type(screen.getByLabelText("Title"), "Dark mode");
    await user.type(screen.getByLabelText("Details"), "Please add a dark theme.");
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(await screen.findByText("Choose a different title.")).toBeVisible();
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
    await user.type(screen.getByLabelText("Title"), " please");
    expect(screen.queryByText("Choose a different title.")).not.toBeInTheDocument();
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
    expect(mocks.createPublicFeedbackAction).toHaveBeenCalledWith({
      description: "A comfortable theme for reviewing updates after hours.",
      slug: "acme-studio",
      title: "Dark mode for the dashboard",
    });
  });
});
