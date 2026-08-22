import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  FeedbackStatusBadge,
  getFeedbackStatusLabel,
  type FeedbackStatus,
} from "@/features/feedback/components/feedback-status-badge";
import { PublicProjectHeader } from "@/features/feedback/components/public-project-header";
import { VoteButton } from "@/features/feedback/components/vote-button";
import { cn } from "@/lib/utils";
import { auth } from "@/server/auth";
import {
  getPublicFeedbackDetail,
  getPublicFeedbackVoteState,
} from "@/server/services/public-feedback";
import { publicFeedbackRouteSchema } from "@/validators/public-feedback";

type FeedbackDetailPageProps = {
  params: Promise<{ id: string; slug: string }>;
};

function formatRelativeTime(date: Date) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );
  if (elapsedSeconds < 60) return "just now";

  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: date.getUTCFullYear() === new Date().getUTCFullYear() ? undefined : "numeric",
  }).format(date);
}

function roadmapDescription(status: FeedbackStatus) {
  switch (status) {
    case "completed":
      return "This feedback is complete and available to customers.";
    case "in_progress":
      return "The team is actively working on this feedback.";
    case "planned":
      return "The team accepted this feedback and plans to schedule it.";
    case "under_review":
      return "The team is reviewing this feedback before making a decision.";
  }
}

export async function generateMetadata({
  params,
}: FeedbackDetailPageProps): Promise<Metadata> {
  const route = await params;
  const parsed = publicFeedbackRouteSchema.safeParse({
    feedbackId: route.id,
    slug: route.slug,
  });
  if (!parsed.success) return {};

  const item = await getPublicFeedbackDetail(
    parsed.data.slug,
    parsed.data.feedbackId,
  );
  if (!item) return {};

  return {
    description: item.description ?? `Feedback for ${item.projectName}`,
    title: `${item.title} | ${item.projectName}`,
  };
}

export default async function FeedbackDetailPage({
  params,
}: FeedbackDetailPageProps) {
  const route = await params;
  const parsed = publicFeedbackRouteSchema.safeParse({
    feedbackId: route.id,
    slug: route.slug,
  });
  if (!parsed.success) notFound();

  const item = await getPublicFeedbackDetail(
    parsed.data.slug,
    parsed.data.feedbackId,
  );
  if (!item) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const initialVoted = await getPublicFeedbackVoteState(
    item.id,
    session?.user.id,
  );
  const feedbackHref = `/p/${item.projectSlug}`;
  const detailHref = `${feedbackHref}/feedback/${item.id}`;
  const status = item.status as FeedbackStatus;

  return (
    <div className="min-h-svh bg-surface">
      <PublicProjectHeader
        project={{
          description: item.projectDescription,
          name: item.projectName,
          slug: item.projectSlug,
        }}
      />

      <main className="mx-auto w-full max-w-content px-5 py-6 md:px-8 md:py-8 xl:px-12 xl:pb-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-muted-foreground">
          <Link className="hover:text-text" href={feedbackHref}>
            Feedback
          </Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{item.title}</span>
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23.5rem]">
          <article className="ui-card rounded-surface p-5 md:p-8">
            <header>
              <FeedbackStatusBadge status={status} />
              <h1 className="mt-4 text-heading-md leading-8 font-bold tracking-[-0.02em] text-foreground md:text-[28px] md:leading-[38px]">
                {item.title}
              </h1>
              {item.description ? (
                <p className="mt-3 line-clamp-2 text-[15px] leading-6 text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </header>

            <div className="my-7 border-t border-border" />

            <section aria-label="Vote for this feedback">
              <VoteButton
                feedbackId={item.id}
                initialVoteCount={item.voteCount}
                initialVoted={initialVoted}
                key={`${item.voteCount}:${initialVoted}`}
                returnTo={detailHref}
                slug={item.projectSlug}
              />
            </section>

            <div className="my-7 border-t border-border" />

            <section aria-labelledby="feedback-details-heading">
              <h2 className="text-base font-bold text-foreground" id="feedback-details-heading">
                Details
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text">
                {item.description || "No additional details were provided."}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Submitted by {item.authorName} · {formatRelativeTime(item.createdAt)}
              </p>
            </section>

            <section
              aria-label="Feedback activity"
              className="mt-6 flex flex-col gap-2 rounded-control bg-surface px-4 py-3 text-[11px] sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="font-semibold text-text">
                Current status: {getFeedbackStatusLabel(status)}
              </p>
              <time className="text-muted-foreground" dateTime={item.updatedAt.toISOString()}>
                Updated {formatRelativeTime(item.updatedAt)}
              </time>
            </section>
          </article>

          <aside className="flex flex-col gap-6">
            <section aria-labelledby="roadmap-status-heading" className="ui-card rounded-surface p-6">
              <h2 className="text-base font-bold text-foreground" id="roadmap-status-heading">
                Roadmap status
              </h2>
              <FeedbackStatusBadge className="mt-5" status={status} />
              <p className="mt-5 text-[13px] leading-5 text-muted-foreground">
                {roadmapDescription(status)}
              </p>
              <Link
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "mt-5 w-full",
                )}
                href={`${feedbackHref}/roadmap`}
              >
                View roadmap
              </Link>
            </section>

            <section aria-labelledby="more-feedback-heading" className="rounded-surface bg-surface-brand p-6">
              <h2 className="text-base font-bold text-foreground" id="more-feedback-heading">
                Have more feedback?
              </h2>
              <p className="mt-4 text-[13px] leading-5 text-muted-foreground">
                Search before submitting to avoid duplicates.
              </p>
              <Link className={cn(buttonVariants(), "mt-5 w-full")} href={`${feedbackHref}#submit-feedback`}>
                Submit feedback
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
