"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPublicFeedbackAction } from "@/features/feedback/actions/create-public-feedback";
import { ACTION_NETWORK_ERROR, getActionErrorMessage, getActionFieldError } from "@/lib/action-errors";
import {
  createPublicFeedbackSchema,
  type CreatePublicFeedbackValues,
} from "@/validators/public-feedback";

const defaultValues: Omit<CreatePublicFeedbackValues, "slug"> = {
  description: "",
  title: "",
};

type PublicFeedbackFormProps = {
  slug: string;
};

// 协调公开反馈提交的客户端校验、登录跳转以及统一 Action 字段/服务端错误展示。
export function PublicFeedbackForm({ slug }: PublicFeedbackFormProps) {
  const router = useRouter();
  const [transportError, setTransportError] = useState<string>();
  const { result: state, execute, isPending } = useAction(createPublicFeedbackAction, {
    onExecute: () => setTransportError(undefined),
    onError: ({ error }) => {
      if (error.serverError?.code === "UNAUTHENTICATED") {
        router.push(`/login?returnTo=${encodeURIComponent(`/p/${slug}`)}`);
      }
      if (error.thrownError) setTransportError(ACTION_NETWORK_ERROR);
    },
  });
  const [submittedValues, setSubmittedValues] = useState<
    Omit<CreatePublicFeedbackValues, "slug"> | null
  >(null);
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
  } = useForm<Omit<CreatePublicFeedbackValues, "slug">>({
    defaultValues,
    resolver: zodResolver(createPublicFeedbackSchema.omit({ slug: true })),
  });
  const [title, description] = useWatch({
    control,
    name: ["title", "description"],
  });
  const titleRegistration = register("title");
  const descriptionRegistration = register("description");
  const settledState = isPending ? undefined : state;
  const titleError =
    errors.title?.message ??
    (submittedValues?.title === title ? getActionFieldError(settledState, "title") : undefined);
  const descriptionError =
    errors.description?.message ??
    (submittedValues?.description === description
      ? getActionFieldError(settledState, "description")
      : undefined);
  const unchangedSinceSubmit =
    submittedValues?.title === title && submittedValues?.description === description;

  // 记录提交时的字段快照，避免用户修改内容后仍看到上一次请求返回的错误。
  const submit = handleSubmit((values) => {
    setSubmittedValues(getValues());
    execute({ ...values, slug });
  });

  const errorMessage = isPending ? undefined : transportError ?? getActionErrorMessage(settledState);

  return (
    <form
      aria-labelledby="submit-feedback-heading"
      className="ui-card rounded-surface p-6"
      id="submit-feedback"
      noValidate
      onSubmit={submit}
    >
      <div>
        <h2 className="text-base font-bold text-foreground" id="submit-feedback-heading">
          Submit feedback
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Sign in is required to post and vote.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-text" htmlFor="feedback-title">
            Title
          </label>
          <Input
            {...titleRegistration}
            aria-describedby={titleError ? "feedback-title-error" : undefined}
            aria-invalid={Boolean(titleError) || undefined}
            className="mt-1.5 text-xs"
            id="feedback-title"
            placeholder="A short, specific request"
          />
          {titleError ? (
            <p className="mt-1.5 text-xs text-error" id="feedback-title-error" role="alert">
              {titleError}
            </p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-semibold text-text" htmlFor="feedback-description">
            Details
          </label>
          <Textarea
            {...descriptionRegistration}
            aria-describedby={
              descriptionError ? "feedback-description-error" : undefined
            }
            aria-invalid={Boolean(descriptionError) || undefined}
            className="mt-1.5 h-20 min-h-20 text-xs"
            id="feedback-description"
            placeholder="Describe the problem and expected outcome..."
          />
          {descriptionError ? (
            <p className="mt-1.5 text-xs text-error" id="feedback-description-error" role="alert">
              {descriptionError}
            </p>
          ) : null}
        </div>
      </div>

      {errorMessage && unchangedSinceSubmit ? (
        <p className="mt-4 text-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button className="mt-5 w-full" disabled={isPending} type="submit">
        {isPending ? "Submitting feedback..." : "Submit feedback"}
      </Button>
    </form>
  );
}
