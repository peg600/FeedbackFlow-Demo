"use client";

import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

/** 将操作失败放在视口内并保留到用户关闭，避免长页面中的错误落在屏幕外。 */
export function ErrorToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-x-4 bottom-4 z-50 ml-auto flex max-h-[calc(100dvh-2rem)] max-w-[var(--size-toast-max)] items-start gap-3 overflow-y-auto rounded-control border border-error bg-background p-4 shadow-toast motion-safe:animate-toast-in">
      <p role="alert" aria-atomic="true" className="min-w-0 flex-1 break-words text-body-sm text-error">{message}</p>
      <Button variant="secondary" size="small" aria-label="Dismiss error" onClick={onDismiss}>Dismiss</Button>
    </div>,
    document.body,
  );
}
