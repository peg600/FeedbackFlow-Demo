import { featureMessages } from "./feature-messages";
import { pageMessages } from "./page-messages";

export type Locale = "en" | "zh";
export const LOCALE_COOKIE = "feedbackflow-locale";
export type TranslationValues = Record<string, string | number>;
export type Translator = (message: string, values?: TranslationValues) => string;

export function parseLocale(value: unknown): Locale {
  return value === "zh" ? "zh" : "en";
}

const chineseMessages: Record<string, string> = { ...pageMessages, ...featureMessages };

/** 仅翻译显式标记的界面文案；插值一次完成，用户内容不会再次作为翻译键处理。 */
export function createTranslator(locale: Locale): Translator {
  return (message, values) => {
    const template = locale === "zh" && Object.hasOwn(chineseMessages, message) ? chineseMessages[message] : message;
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      values && Object.hasOwn(values, name) ? String(values[name]) : placeholder,
    );
  };
}

export function createI18n(locale: Locale) {
  return {
    locale,
    t: createTranslator(locale),
    formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
        timeZone: "UTC",
        ...options,
      }).format(new Date(date)),
  };
}
