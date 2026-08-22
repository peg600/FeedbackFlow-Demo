import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VoteButton } from "@/features/feedback/components/vote-button";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  voteFeedbackAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/features/feedback/actions/vote-feedback", () => ({
  voteFeedbackAction: mocks.voteFeedbackAction,
}));

const props = {
  feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  initialVoteCount: 82,
  initialVoted: false,
  returnTo: "/p/acme-studio/feedback/c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  slug: "acme-studio",
};

describe("VoteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Figma vote summary and accepts the server-confirmed vote", async () => {
    const user = userEvent.setup();
    mocks.voteFeedbackAction.mockResolvedValue({
      ok: true,
      requestId: "request-1",
      voteCount: 83,
      voted: true,
    });
    render(<VoteButton {...props} />);

    expect(screen.getByText("82", { selector: "strong" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Vote for this" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Voted" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(screen.getByText("83", { selector: "strong" })).toBeVisible();
    expect(mocks.voteFeedbackAction).toHaveBeenCalledWith({
      feedbackId: props.feedbackId,
      slug: props.slug,
    });
  });

  it("rolls back the optimistic total and exposes a safe error", async () => {
    const user = userEvent.setup();
    mocks.voteFeedbackAction.mockResolvedValue({
      error: "Unable to update your vote. Try again.",
      ok: false,
      requestId: "request-2",
    });
    render(<VoteButton {...props} />);

    await user.click(screen.getByRole("button", { name: "Vote for this" }));

    await waitFor(() => {
      expect(
        screen.getByText("Unable to update your vote. Try again."),
      ).toBeVisible();
    });
    expect(screen.getByRole("button", { name: "Vote for this" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("82", { selector: "strong" })).toBeVisible();
  });

  it("sends anonymous visitors to login with the internal return path", async () => {
    const user = userEvent.setup();
    mocks.voteFeedbackAction.mockResolvedValue({
      code: "unauthenticated",
      error: "Sign in to vote for feedback.",
      ok: false,
      requestId: "request-3",
    });
    render(<VoteButton {...props} />);

    await user.click(screen.getByRole("button", { name: "Vote for this" }));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(
        "/login?returnTo=%2Fp%2Facme-studio%2Ffeedback%2Fc0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
      );
    });
  });
});
