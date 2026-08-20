import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-placeholder border border-border-subtle bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-standard placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-focus-control-ring focus-visible:outline-none aria-invalid:border-error aria-invalid:ring-0 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-disabled-foreground",
        className,
      )}
      {...props}
    />
  );
}
