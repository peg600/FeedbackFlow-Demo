"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { createI18n, type Locale } from "./shared";

const defaultI18n = createI18n("en");
const I18nContext = createContext<{ locale: Locale; t: typeof defaultI18n.t; formatDate: typeof defaultI18n.formatDate; setLocale: (locale: Locale) => void }>({ ...defaultI18n, setLocale: () => {} });

/** 语言初值来自服务端，切换时即时更新交互岛，再与刷新后的服务端语言同步。 */
export function I18nProvider({ locale: initialLocale, children }: { locale: Locale; children: ReactNode }) {
  const [selection, setSelection] = useState({ source: initialLocale, locale: initialLocale });
  if (selection.source !== initialLocale) {
    setSelection({ source: initialLocale, locale: initialLocale });
  }
  const locale = selection.source === initialLocale ? selection.locale : initialLocale;
  const setLocale = useCallback((nextLocale: Locale) => setSelection({ source: initialLocale, locale: nextLocale }), [initialLocale]);
  const value = useMemo(() => ({ ...createI18n(locale), setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
