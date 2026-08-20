import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-placeholder border text-sm font-semibold transition-[background-color,border-color,transform] duration-150 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-outline disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] active:duration-100",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover active:border-primary-active active:bg-primary-active",
        secondary:
          "border-border-subtle bg-background text-foreground hover:bg-surface-subtle active:bg-surface-hover",
      },
      size: {
        default: "h-component-control px-[18px]",
        compact: "h-component-control px-[18px]",
        small: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      type={type}
      {...props}
    />
  );
}

export { buttonVariants };
