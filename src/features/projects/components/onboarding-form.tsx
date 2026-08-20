"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/features/projects/actions/create-project";
import { projectSchema, type ProjectValues } from "@/validators/project";

const defaultValues: ProjectValues = {
  description: "",
  name: "",
  slug: "",
};

export function createSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    null,
  );
  const slugWasEdited = useRef(false);
  const [submittedValues, setSubmittedValues] =
    useState<ProjectValues | null>(null);
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setValue,
  } = useForm<ProjectValues>({
    defaultValues,
    resolver: zodResolver(projectSchema),
  });
  const [name, slug, description] = useWatch({
    control,
    name: ["name", "slug", "description"],
  });
  const nameRegistration = register("name");
  const slugRegistration = register("slug");
  const descriptionRegistration = register("description");
  const settledState = isPending ? null : state;

  const submit = handleSubmit((values) => {
    setSubmittedValues(getValues());
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("slug", values.slug);
    formData.set("description", values.description);
    startTransition(() => formAction(formData));
  });

  const nameError =
    errors.name?.message ??
    (submittedValues?.name === name
      ? settledState?.fieldErrors?.name
      : undefined);
  const slugError =
    errors.slug?.message ??
    (submittedValues?.slug === slug
      ? settledState?.fieldErrors?.slug
      : undefined);
  const descriptionError =
    errors.description?.message ??
    (submittedValues?.description === description
      ? settledState?.fieldErrors?.description
      : undefined);
  const unchangedSinceSubmit =
    submittedValues?.name === name &&
    submittedValues?.slug === slug &&
    submittedValues?.description === description;

  return (
    <form
      aria-labelledby="onboarding-title"
      className="ui-card flex w-full max-w-[480px] flex-col gap-7 p-6 md:p-9"
      noValidate
      onSubmit={submit}
    >
      <div className="flex w-full flex-col gap-2 md:max-w-[248px]">
        <label className="text-xs font-semibold text-text" htmlFor="name">
          Project name
        </label>
        <Input
          {...nameRegistration}
          aria-describedby={nameError ? "name-error" : undefined}
          aria-invalid={Boolean(nameError) || undefined}
          autoComplete="organization"
          id="name"
          onChange={(event) => {
            void nameRegistration.onChange(event);
            if (!slugWasEdited.current) {
              setValue("slug", createSlug(event.target.value), {
                shouldValidate: false,
              });
            }
          }}
          placeholder="Acme Studio"
        />
        {nameError ? (
          <p className="text-xs text-error" id="name-error" role="alert">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-2 md:max-w-[248px]">
        <label className="text-xs font-semibold text-text" htmlFor="slug">
          Public URL slug
        </label>
        <Input
          {...slugRegistration}
          aria-describedby={slugError ? "slug-error slug-help" : "slug-help"}
          aria-invalid={Boolean(slugError) || undefined}
          autoCapitalize="none"
          autoComplete="off"
          id="slug"
          onChange={(event) => {
            slugWasEdited.current = true;
            void slugRegistration.onChange(event);
          }}
          placeholder="acme-studio"
          spellCheck={false}
        />
        {slugError ? (
          <p className="text-xs text-error" id="slug-error" role="alert">
            {slugError}
          </p>
        ) : null}
        <p className="text-[11px] leading-4 text-muted-foreground" id="slug-help">
          Slugs must be unique.
        </p>
      </div>

      <div
        aria-label="Public feedback URL preview"
        className="w-full overflow-x-auto rounded-placeholder bg-surface px-3.5 py-4 text-xs font-semibold text-primary md:max-w-[248px]"
      >
        feedbackflow.app/p/{slug || "your-project"}
      </div>

      <div className="flex w-full flex-col gap-2 md:max-w-[248px]">
        <label
          className="text-xs font-semibold text-text"
          htmlFor="description"
        >
          Project description
        </label>
        <Textarea
          {...descriptionRegistration}
          aria-describedby={
            descriptionError
              ? "description-error description-help"
              : "description-help"
          }
          aria-invalid={Boolean(descriptionError) || undefined}
          className="min-h-[94px] placeholder:text-disabled-foreground"
          id="description"
          placeholder="Help us decide what to build next."
        />
        {descriptionError ? (
          <p
            className="text-xs text-error"
            id="description-error"
            role="alert"
          >
            {descriptionError}
          </p>
        ) : null}
        <p
          className="text-[11px] leading-4 text-muted-foreground"
          id="description-help"
        >
          This description appears on the public board.
        </p>
      </div>

      {settledState?.error && unchangedSinceSubmit ? (
        <p className="text-body-sm text-error" role="alert">
          {settledState.error}
        </p>
      ) : null}

      <Button
        className="w-full whitespace-nowrap md:ml-auto md:w-[192px]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Creating workspace..." : "Create workspace"}
      </Button>
    </form>
  );
}
