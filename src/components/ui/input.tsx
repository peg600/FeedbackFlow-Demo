import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input">;

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-control w-full rounded-control border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-focus-ring focus-visible:outline-none aria-invalid:border-error aria-invalid:ring-[3px] aria-invalid:ring-error/10 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-disabled-foreground",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
