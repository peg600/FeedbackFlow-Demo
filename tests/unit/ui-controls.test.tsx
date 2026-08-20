import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input, inputVariants } from "@/components/ui/input";
import { Select, selectVariants } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

describe("shared UI controls", () => {
  it("uses the component-spec button states and named sizes", () => {
    render(<Button disabled>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("h-component-control", "rounded-placeholder");
    expect(buttonVariants({ size: "compact" })).toContain(
      "h-component-control",
    );
    expect(buttonVariants({ size: "small" })).toContain("h-8");
  });

  it("exposes named input sizes and validation states", () => {
    render(<Input aria-label="Project name" state="success" />);

    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveClass(
      "h-component-control",
      "border-status-completed",
    );
    expect(inputVariants({ size: "filter" })).toContain("h-select-control");
  });

  it("renders the Figma dropdown panel and updates its form value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select
        aria-label="Sort feedback"
        name="sort"
        onValueChange={onValueChange}
        options={[
          { label: "Newest", value: "newest" },
          { label: "Most votes", value: "votes" },
        ]}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Sort feedback" });
    expect(select).toHaveClass("h-select-control", "whitespace-nowrap");

    await user.click(select);

    expect(select).toHaveAttribute("data-state", "open");
    expect(
      select.querySelector('img[src="/icons/select-chevron-up.svg"]'),
    ).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toHaveClass(
      "ui-select-panel",
      "max-h-[min(240px,var(--radix-select-content-available-height))]",
      "w-[min(200px,var(--radix-select-content-available-width))]",
      "max-w-[var(--radix-select-content-available-width)]",
    );
    expect(screen.getByRole("option", { name: "Newest" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "Newest" })).toHaveClass("h-9");
    expect(screen.getByRole("option", { name: "Most votes" })).toHaveClass(
      "h-9",
    );

    await user.click(screen.getByRole("option", { name: "Most votes" }));

    expect(onValueChange).toHaveBeenCalledWith("votes");
    expect(screen.getByRole("combobox", { name: "Sort feedback" })).toHaveTextContent(
      "Most votes",
    );
    expect(document.querySelector('input[name="sort"]')).toHaveValue("votes");
    expect(selectVariants({ size: "status" })).toContain("rounded-pill");
  });

  it("supports keyboard navigation and closing the dropdown", async () => {
    const user = userEvent.setup();
    render(
      <Select
        aria-label="Filter by status"
        options={[
          { label: "All status", value: "all" },
          { label: "Planned", value: "planned" },
        ]}
      />,
    );

    const trigger = screen.getByRole("combobox", {
      name: "Filter by status",
    });
    await user.click(trigger);
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("option", { name: "Planned" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
  });

  it("shares input validation styling with textarea", () => {
    render(
      <>
        <Input aria-invalid aria-label="Project slug" />
        <Textarea aria-invalid aria-label="Description" />
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Project slug" })).toHaveClass(
      "aria-invalid:bg-[url('/icons/alert-circle.svg')]",
      "aria-invalid:ring-0",
    );

    expect(screen.getByRole("textbox", { name: "Description" })).toHaveClass(
      "rounded-placeholder",
      "aria-invalid:border-error",
      "aria-invalid:ring-0",
    );
  });
});
