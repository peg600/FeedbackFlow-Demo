"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { iconPaths } from "@/lib/icons";
import type { DashboardSearchParams } from "@/validators/dashboard";

const statusOptions: readonly SelectOption[] = [
  { label: "All status", value: "all" },
  {
    indicatorSrc: iconPaths.selectStatusPlanned,
    label: "Planned",
    value: "planned",
  },
  {
    indicatorSrc: iconPaths.selectStatusInProgress,
    label: "In progress",
    value: "in_progress",
  },
  {
    indicatorSrc: iconPaths.selectStatusUnderReview,
    label: "Under review",
    value: "under_review",
  },
  {
    indicatorSrc: iconPaths.selectStatusCompleted,
    label: "Completed",
    value: "completed",
  },
];

const sortOptions: readonly SelectOption[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Most votes", value: "votes" },
];

export function DashboardFilters({ params }: { params: DashboardSearchParams }) {
  const pathname = usePathname();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of ["search", "status", "sort"] as const) {
      const value = String(data.get(key) ?? "").trim();
      if (value && !((key === "status" && value === "all") || (key === "sort" && value === "newest"))) next.set(key, value);
    }
    router.push(next.size ? `${pathname}?${next}` : pathname);
  }

  return (
    <form className="grid items-stretch gap-3 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto]" onSubmit={submit} ref={formRef}>
      <div className="relative min-w-0 md:col-span-2 lg:col-span-1">
        <Image alt="" className="absolute top-1/2 left-3 -translate-y-1/2 opacity-60 md:hidden" height={18} src={iconPaths.search} width={18} />
        <Input aria-label="Search feedback" className="bg-surface pr-3 pl-10 text-[13px] md:px-3 lg:bg-background" defaultValue={params.search} maxLength={120} name="search" placeholder="Search feedback..." size="filterMobile" type="search" />
      </div>
      <Select
        aria-label="Filter by status"
        className="hidden md:block md:w-full lg:w-max lg:min-w-[106px]"
        defaultValue={params.status}
        name="status"
        onValueChange={() => formRef.current?.requestSubmit()}
        options={statusOptions}
      />
      <Select
        aria-label="Sort feedback"
        className="hidden md:block md:w-full lg:w-max lg:min-w-[100px]"
        defaultValue={params.sort}
        name="sort"
        onValueChange={() => formRef.current?.requestSubmit()}
        options={sortOptions}
      />
      <button className="sr-only" type="submit">Apply filters</button>
    </form>
  );
}
