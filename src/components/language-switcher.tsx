"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

/** 浏览器语言偏好不含敏感信息；只保存受控枚举，并同步根元素的可访问语言。 */
function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
}

/** 持久化语言偏好并刷新服务端文案；不跳转 URL，保留筛选、回跳参数和当前交互状态。 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function selectLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    persistLocale(nextLocale);
    setLocale(nextLocale);
    startTransition(() => router.refresh());
  }

  return (
    <div aria-label="Language / 语言" aria-busy={pending} role="group" className="inline-flex shrink-0 items-center rounded-control border border-border bg-background p-1 text-xs font-semibold">
      {([ ["en", "English"], ["zh", "中文"] ] as const).map(([value, label]) => (
        <button
          aria-pressed={locale === value}
          className={cn("min-h-8 rounded-placeholder px-2.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground", locale === value && "bg-surface-brand text-primary")}
          disabled={pending}
          key={value}
          lang={value === "zh" ? "zh-CN" : "en"}
          onClick={() => selectLocale(value)}
          type="button"
        >{label}</button>
      ))}
    </div>
  );
}
