"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProjectAction } from "@/features/projects/actions/update-project";
import { ACTION_NETWORK_ERROR, getActionErrorMessage, getActionFieldError } from "@/lib/action-errors";
import type { ProjectSettingsValues } from "@/validators/project";

type Props = {
  project: { name: string; slug: string; description: string | null; isPublic: boolean };
};

// 管理项目设置的受控表单，并按提交快照区分仍然有效的字段错误与已经过期的错误。
export function ProjectSettingsForm({ project }: Props) {
  const router = useRouter();
  const [transportError, setTransportError] = useState<string>();
  const [values, setValues] = useState<ProjectSettingsValues>({
    ...project,
    description: project.description ?? "",
  });
  const [submittedValues, setSubmittedValues] = useState<ProjectSettingsValues>();
  const { result, execute, isPending: pending } = useAction(updateProjectAction, {
    onExecute: () => setTransportError(undefined),
    onError: ({ error }) => {
      if (error.serverError?.code === "UNAUTHENTICATED") {
        router.push("/login?returnTo=/dashboard/settings");
      }
      if (error.thrownError) setTransportError(ACTION_NETWORK_ERROR);
    },
  });
  const state = pending ? undefined : result;
  const unchangedSinceSubmit = submittedValues?.name === values.name &&
    submittedValues?.slug === values.slug &&
    submittedValues?.description === values.description &&
    submittedValues?.isPublic === values.isPublic;
  const message = pending || !unchangedSinceSubmit
    ? undefined
    : transportError ?? getActionErrorMessage(state) ?? state?.data?.message;
  const fieldError = (name: "name" | "slug" | "description") =>
    submittedValues?.[name] === values[name] ? getActionFieldError(state, name) : undefined;
  // 为文本字段统一生成值、可访问性属性和修改处理，字段改变后自动隐藏旧的服务端错误。
  const field = (name: "name" | "slug" | "description") => {
    const error = fieldError(name);
    return {
      "aria-describedby": error ? `${name}-error` : undefined,
      "aria-invalid": error ? true : undefined,
      value: values[name],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setValues((current) => ({ ...current, [name]: value }));
      },
    };
  };

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmittedValues(values);
        execute(values);
      }}
    >
      <div className="grid gap-2">
        <label className="text-xs font-semibold" htmlFor="name">Project name</label>
        <Input disabled={pending} id="name" name="name" {...field("name")} />
        {fieldError("name") ? (
          <p className="text-xs text-error" id="name-error" role="alert">{fieldError("name")}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <label className="text-xs font-semibold" htmlFor="slug">Public URL slug</label>
        <Input disabled={pending} id="slug" name="slug" {...field("slug")} />
        <p className="text-[11px] text-muted-foreground">feedbackflow.app/p/{project.slug}</p>
        {fieldError("slug") ? (
          <p className="text-xs text-error" id="slug-error" role="alert">{fieldError("slug")}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <label className="text-xs font-semibold" htmlFor="description">Description</label>
        <Textarea disabled={pending} id="description" name="description" {...field("description")} />
        {fieldError("description") ? (
          <p className="text-xs text-error" id="description-error" role="alert">{fieldError("description")}</p>
        ) : null}
      </div>
      <label className="flex items-center justify-between gap-5">
        <span>
          <span className="block text-[13px] font-semibold">Make project public</span>
          <span className="mt-1 block text-[11px] text-muted-foreground">Anyone with the link can view public feedback and roadmap.</span>
        </span>
        <input
          className="size-5 accent-primary"
          disabled={pending}
          checked={values.isPublic}
          onChange={(event) => {
            const checked = event.target.checked;
            setValues((current) => ({ ...current, isPublic: checked }));
          }}
          name="isPublic"
          type="checkbox"
        />
      </label>
      <div className="flex flex-wrap items-center justify-end gap-4">
        <p aria-live="polite" className={state?.data ? "text-xs text-success" : "text-xs text-error"}>{message}</p>
        <Button disabled={pending} type="submit">{pending ? "Saving..." : "Save changes"}</Button>
      </div>
    </form>
  );
}
