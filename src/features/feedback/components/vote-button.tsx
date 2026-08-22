"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { voteFeedbackAction } from "@/features/feedback/actions/vote-feedback";

type VoteButtonProps = {
  feedbackId: string;
  initialVoteCount: number;
  initialVoted: boolean;
  returnTo: string;
  slug: string;
};

type VoteState = {
  voteCount: number;
  voted: boolean;
};

export function VoteButton({
  feedbackId,
  initialVoteCount,
  initialVoted,
  returnTo,
  slug,
}: VoteButtonProps) {
  const router = useRouter();
  const [confirmedVote, setConfirmedVote] = useState<VoteState>({
    voteCount: initialVoteCount,
    voted: initialVoted,
  });
  const [optimisticVote, setOptimisticVote] = useOptimistic(
    confirmedVote,
    (_currentVote, nextVote: VoteState) => nextVote,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const descriptionId = `vote-status-${feedbackId}`;

  function handleVote() {
    const nextVote = {
      voteCount: optimisticVote.voteCount + (optimisticVote.voted ? -1 : 1),
      voted: !optimisticVote.voted,
    };
    setError(null);

    startTransition(async () => {
      setOptimisticVote(nextVote);
      try {
        const result = await voteFeedbackAction({ feedbackId, slug });

        if (result.code === "unauthenticated") {
          router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        if (!result.ok || result.voteCount === undefined || result.voted === undefined) {
          setError(result.error ?? "Unable to update your vote. Try again.");
          return;
        }

        setConfirmedVote({
          voteCount: result.voteCount,
          voted: result.voted,
        });
      } catch {
        setError("Unable to update your vote. Try again.");
      }
    });
  }

  return (
    <div className="flex items-center gap-5 sm:gap-6">
      <div className="flex w-[100px] shrink-0 flex-col items-center gap-1 rounded-token bg-surface-brand px-4 py-3">
        <span aria-hidden="true" className="text-sm leading-none text-primary">
          ▲
        </span>
        <strong className="text-[22px] leading-6 text-foreground">
          {optimisticVote.voteCount}
        </strong>
        <span className="text-[10px] text-muted-foreground">votes</span>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-2">
        <Button
          aria-describedby={descriptionId}
          aria-pressed={optimisticVote.voted}
          disabled={isPending}
          onClick={handleVote}
        >
          {isPending
            ? "Updating vote..."
            : optimisticVote.voted
              ? "Voted"
              : "Vote for this"}
        </Button>
        <p
          className={error ? "text-[10px] text-error" : "text-[10px] text-muted-foreground"}
          id={descriptionId}
          role={error ? "alert" : undefined}
        >
          {error ?? "Optimistic update · rolls back on error"}
        </p>
      </div>
    </div>
  );
}
