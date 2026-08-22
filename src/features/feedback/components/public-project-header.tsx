import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "FF"
  );
}

type PublicProjectHeaderProps = {
  project: {
    description: string | null;
    name: string;
    slug: string;
  };
  showSubmitFeedback?: boolean;
};

export function PublicProjectHeader({
  project,
  showSubmitFeedback = true,
}: PublicProjectHeaderProps) {
  const boardHref = `/p/${project.slug}`;

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex min-h-[68px] w-full max-w-content items-center justify-between gap-4 px-5 py-3 md:min-h-[82px] md:px-8 xl:px-12">
        <Link className="flex min-w-0 items-center gap-3" href={boardHref}>
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-brand text-sm font-bold text-primary"
          >
            {getInitials(project.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold text-foreground">
              {project.name}
            </span>
            <span className="hidden truncate text-[11px] text-muted-foreground md:block">
              {project.description || "Help us build a better product"}
            </span>
          </span>
        </Link>

        <nav aria-label="Public project navigation" className="flex shrink-0 items-center gap-3 md:gap-8">
          <div className="hidden items-center gap-6 text-[13px] font-semibold md:flex">
            <Link aria-current="page" className="text-primary" href={boardHref}>
              Feedback
            </Link>
            <Link className="text-text hover:text-foreground" href={`${boardHref}/roadmap`}>
              Roadmap
            </Link>
          </div>
          {showSubmitFeedback ? (
            <Link
              className={cn(buttonVariants(), "px-4 text-[13px]")}
              href={`${boardHref}#submit-feedback`}
            >
              <span className="md:hidden">Submit</span>
              <span className="hidden md:inline">Submit feedback</span>
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
