"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";

import { iconPaths } from "@/lib/icons";

/** 选择链接后关闭原生菜单；按 Escape 关闭时，把键盘焦点交还菜单入口。 */
export function HeaderMenu({ children, label }: { children: ReactNode; label: string }) {
  const details = useRef<HTMLDetailsElement>(null);

  return (
    <details
      className="relative xl:hidden"
      ref={details}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("a")) {
          if (details.current) details.current.open = false;
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && details.current?.open) {
          details.current.open = false;
          details.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        aria-label={label}
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-placeholder text-text hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-outline [&::-webkit-details-marker]:hidden"
      >
        <Image alt="" aria-hidden="true" height={24} src={iconPaths.menu} width={24} />
      </summary>
      {children}
    </details>
  );
}
