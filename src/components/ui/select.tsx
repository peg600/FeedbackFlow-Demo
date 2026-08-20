"use client";

import Image from "next/image";
import { type AriaAttributes, useRef, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Select as SelectPrimitive } from "radix-ui";

import { iconPaths } from "@/lib/icons";
import { cn } from "@/lib/utils";

const selectVariants = cva(
  "flex w-full cursor-pointer items-center justify-between gap-3 overflow-hidden whitespace-nowrap border bg-background px-3 text-left text-sm font-medium text-text outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-standard hover:border-border-hover hover:bg-surface-subtle focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-focus-control-ring data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-focus-control-ring aria-invalid:border-error disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-select-control rounded-placeholder",
        status:
          "h-7 w-auto max-w-full rounded-pill border-transparent py-1 pr-2 pl-2.5 text-[11px] font-bold",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export type SelectOption = {
  value: string;
  label: string;
  indicatorSrc?: string;
};

type SelectProps = {
  "aria-describedby"?: AriaAttributes["aria-describedby"];
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-label"?: AriaAttributes["aria-label"];
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: readonly SelectOption[];
  size?: VariantProps<typeof selectVariants>["size"];
  triggerClassName?: string;
  value?: string;
};

export function Select({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  className,
  defaultValue,
  disabled = false,
  id,
  name,
  onValueChange,
  options,
  size,
  triggerClassName,
  value,
}: SelectProps) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const selectedValue = isControlled ? value : uncontrolledValue;
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const shouldBlurTriggerOnCloseRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);

  function handleValueChange(nextValue: string) {
    if (!isControlled) setUncontrolledValue(nextValue);
    if (inputRef.current) inputRef.current.value = nextValue;
    onValueChange?.(nextValue);
  }

  return (
    <SelectPrimitive.Root
      disabled={disabled}
      onOpenChange={setIsOpen}
      onValueChange={handleValueChange}
      value={selectedValue}
    >
      <div className={cn("inline-block max-w-full", className)}>
        {name ? (
          <input
            disabled={disabled}
            name={name}
            ref={inputRef}
            type="hidden"
            value={selectedValue}
          />
        ) : null}
        <SelectPrimitive.Trigger
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          className={cn(selectVariants({ size }), triggerClassName)}
          id={id}
          ref={triggerRef}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon asChild>
            <Image
              alt=""
              aria-hidden="true"
              className="size-2.5 shrink-0"
              height={10}
              src={
                isOpen
                  ? iconPaths.selectChevronUp
                  : iconPaths.selectChevronDown
              }
              width={10}
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
      </div>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          align="start"
          avoidCollisions
          className="ui-select-panel z-50 max-h-[min(240px,var(--radix-select-content-available-height))] w-[min(200px,var(--radix-select-content-available-width))] max-w-[var(--radix-select-content-available-width)] overflow-hidden rounded-placeholder border border-border-subtle bg-background p-1.5 shadow-[0_12px_12px_rgb(0_0_0_/_8%)]"
          collisionPadding={8}
          onCloseAutoFocus={(event) => {
            if (!shouldBlurTriggerOnCloseRef.current) return;

            event.preventDefault();
            triggerRef.current?.blur();
            shouldBlurTriggerOnCloseRef.current = false;
          }}
          onPointerDownOutside={() => {
            shouldBlurTriggerOnCloseRef.current = true;
          }}
          position="popper"
          side="bottom"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="flex max-h-[inherit] flex-col gap-0.5 overflow-y-auto">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="group flex h-9 w-full cursor-pointer select-none items-center gap-2 rounded-[6px] px-3 py-2 text-[13px] font-medium text-text outline-none data-[highlighted]:bg-surface-subtle data-[state=checked]:bg-surface-hover data-[state=checked]:font-semibold data-[state=checked]:text-foreground"
                key={option.value}
                value={option.value}
              >
                <span className="relative flex size-3 shrink-0 items-center justify-center">
                  <SelectPrimitive.ItemIndicator asChild>
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="size-3"
                      height={12}
                      src={iconPaths.selectCheck}
                      width={12}
                    />
                  </SelectPrimitive.ItemIndicator>
                  {option.indicatorSrc ? (
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="size-2 group-data-[state=checked]:hidden"
                      height={8}
                      src={option.indicatorSrc}
                      width={8}
                    />
                  ) : null}
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { selectVariants };
