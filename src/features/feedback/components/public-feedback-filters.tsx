"use client";

import { type FormEvent, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import type { PublicFeedbackSearchParams } from "@/validators/public-feedback";

const sortOptions: readonly SelectOption[] = [
  { label: "Most voted", value: "votes" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
];

const statusOptions: readonly SelectOption[] = [
  { label: "All status", value: "all" },
  { label: "Under review", value: "under_review" },
  { label: "Planned", value: "planned" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export function PublicFeedbackFilters({
  params,
}: {
  params: PublicFeedbackSearchParams;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    const search = String(data.get("search") ?? "").trim();
    const sort = String(data.get("sort") ?? "votes");
    const status = String(data.get("status") ?? "all");

    if (search) next.set("search", search);
    if (sort !== "votes") next.set("sort", sort);
    if (status !== "all") next.set("status", status);

    router.push(next.size ? `${pathname}?${next}` : pathname);
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      onSubmit={submit}
      ref={formRef}
    >
      <Input
        aria-label="Search feedback"
        className="bg-surface text-[13px]"
        defaultValue={params.search}
        maxLength={120}
        name="search"
        placeholder="Search feedback..."
        type="search"
      />
      <Select
        aria-label="Sort feedback"
        className="min-w-0 sm:w-[122px]"
        defaultValue={params.sort}
        name="sort"
        onValueChange={() => formRef.current?.requestSubmit()}
        options={sortOptions}
      />
      <Select
        aria-label="Filter by status"
        className="min-w-0 sm:w-[124px]"
        defaultValue={params.status}
        name="status"
        onValueChange={() => formRef.current?.requestSubmit()}
        options={statusOptions}
      />
      <button className="sr-only" type="submit">
        Apply filters
      </button>
    </form>
  );
}
