import { createI18n, type Locale } from "./shared";

/** 最近记录显示本地化相对时间，30 天前使用 UTC 日期，避免服务器时区影响输出。 */
export function formatRelativeTime(date: Date, locale: Locale, compact = false) {
  const { t, formatDate } = createI18n(locale);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return t(compact ? "Just now" : "just now");
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 30) return formatDate(date, { day: "numeric", month: "short", year: date.getUTCFullYear() === new Date().getUTCFullYear() ? undefined : "numeric" });
  const count = minutes < 60 ? minutes : hours < 24 ? hours : days;
  const unit = minutes < 60 ? "minute" : hours < 24 ? "hour" : "day";
  const message = compact ? `{count}${unit[0]} ago` : `{count} ${unit}${count === 1 ? "" : "s"} ago`;
  return t(message, { count });
}
