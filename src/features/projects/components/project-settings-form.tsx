"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProjectAction } from "@/features/projects/actions/update-project";

type Props = { project: { name: string; slug: string; description: string | null; isPublic: boolean } };

export function ProjectSettingsForm({ project }: Props) {
  const [state, action, pending] = useActionState(updateProjectAction, {});
  const field = (name: "name" | "slug" | "description") => {
    const error = state.errors?.[name]?.[0];
    return { "aria-describedby": error ? `${name}-error` : undefined, "aria-invalid": error ? true : undefined };
  };

  return (
    <form action={action} className="flex flex-col gap-7">
      <div className="grid gap-2"><label className="text-xs font-semibold" htmlFor="name">Project name</label><Input defaultValue={project.name} id="name" name="name" {...field("name")} />{state.errors?.name?.[0] ? <p className="text-xs text-error" id="name-error">{state.errors.name[0]}</p> : null}</div>
      <div className="grid gap-2"><label className="text-xs font-semibold" htmlFor="slug">Public URL slug</label><Input defaultValue={project.slug} id="slug" name="slug" {...field("slug")} /><p className="text-[11px] text-muted-foreground">feedbackflow.app/p/{project.slug}</p>{state.errors?.slug?.[0] ? <p className="text-xs text-error" id="slug-error">{state.errors.slug[0]}</p> : null}</div>
      <div className="grid gap-2"><label className="text-xs font-semibold" htmlFor="description">Description</label><Textarea defaultValue={project.description ?? ""} id="description" name="description" {...field("description")} />{state.errors?.description?.[0] ? <p className="text-xs text-error" id="description-error">{state.errors.description[0]}</p> : null}</div>
      <label className="flex items-center justify-between gap-5"><span><span className="block text-[13px] font-semibold">Make project public</span><span className="mt-1 block text-[11px] text-muted-foreground">Anyone with the link can view public feedback and roadmap.</span></span><input className="size-5 accent-primary" defaultChecked={project.isPublic} name="isPublic" type="checkbox" /></label>
      <div className="flex flex-wrap items-center justify-end gap-4"><p aria-live="polite" className={state.success ? "text-xs text-success" : "text-xs text-error"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Saving…" : "Save changes"}</Button></div>
    </form>
  );
}
