import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "w-full rounded-placeholder border border-border-subtle bg-background px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-standard placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-focus-control-ring focus-visible:outline-none aria-invalid:border-error aria-invalid:bg-[url('/icons/alert-circle.svg')] aria-invalid:bg-[length:16px_16px] aria-invalid:bg-[position:right_12px_center] aria-invalid:bg-no-repeat aria-invalid:pr-9 aria-invalid:ring-0 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-disabled-foreground",
  {
    variants: {
      size: {
        default: "h-component-control",
        filter: "h-select-control",
        filterMobile: "h-[50px] md:h-[42px] lg:h-select-control",
      },
      state: {
        default: "",
        success: "border-status-completed bg-[url('/icons/check-circle.svg')] bg-[position:right_12px_center] bg-no-repeat pr-9 focus:border-status-completed focus:ring-status-completed/10",
      },
    },
    defaultVariants: {
      size: "default",
      state: "default",
    },
  },
);

type InputProps = Omit<ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>;

export function Input({ className, size, state, type, ...props }: InputProps) {
  return (
    <input
      className={cn(
        inputVariants({ className, size, state }),
      )}
      type={type}
      {...props}
    />
  );
}

export { inputVariants };
