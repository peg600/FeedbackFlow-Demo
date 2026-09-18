import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StatusSelect } from "@/features/feedback/components/status-select";

const mocks = vi.hoisted(() => ({ update: vi.fn(), push: vi.fn() }));
vi.mock("@/features/feedback/actions/update-feedback-status", () => ({ updateFeedbackStatusAction: mocks.update }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("StatusSelect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits the selected status and accepts the server-confirmed value", async () => {
    mocks.update.mockResolvedValue({ data: { feedbackId: "feedback-1", status: "planned" } });
    const user = userEvent.setup();
    render(<StatusSelect feedbackId="feedback-1" initialStatus="under_review" />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Planned" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ feedbackId: "feedback-1", status: "planned" }));
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
    expect(screen.getByRole("combobox")).toHaveTextContent("Planned");
  });

  it("rolls back when feedback is unavailable and links the error to the control", async () => {
    mocks.update.mockResolvedValue({ serverError: { code: "FEEDBACK_NOT_AVAILABLE", message: "This feedback is unavailable.", requestId: "r-1" } });
    const user = userEvent.setup();
    render(<StatusSelect feedbackId="feedback-1" initialStatus="under_review" />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Planned" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This feedback is unavailable.");
    expect(screen.getByRole("combobox")).toHaveTextContent("Under review");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-describedby", "status-error-feedback-1");
  });

  it("rolls back after a network failure", async () => {
    mocks.update.mockRejectedValue(new Error("connection internals"));
    const user = userEvent.setup();
    render(<StatusSelect feedbackId="feedback-1" initialStatus="under_review" />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Planned" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Check your connection");
    expect(screen.getByRole("combobox")).toHaveTextContent("Under review");
  });
});
