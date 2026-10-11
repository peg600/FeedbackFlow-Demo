import { describe, expect, it } from "vitest";

import { createI18n, createTranslator, parseLocale } from "@/lib/i18n/shared";
import { ERROR_CATALOG } from "@/lib/errors";

describe("locale parsing and translation boundaries", () => {
  it.each([undefined, null, "", "en", "fr", "zh-CN", "ZH", ["zh"], { locale: "zh" }])(
    "defaults unsupported locale %j to English",
    (value) => expect(parseLocale(value)).toBe("en"),
  );

  it("accepts the Chinese locale from the explicit whitelist", () => {
    expect(parseLocale("zh")).toBe("zh");
  });

  it("preserves English and falls back to the original unknown message", () => {
    expect(createTranslator("en")("Welcome back")).toBe("Welcome back");
    expect(createTranslator("zh")("A newly added message")).toBe("A newly added message");
    expect(createTranslator("zh")("constructor")).toBe("constructor");
    expect(createTranslator("zh")("toString")).toBe("toString");
  });

  it.each(Object.entries(ERROR_CATALOG))("provides a useful Chinese translation for %s", (_, error) => {
    const translated = createTranslator("zh")(error.message);
    expect(translated).not.toBe(error.message);
    expect(translated).toMatch(/[\u4e00-\u9fff]/);
    expect(createTranslator("en")(error.message)).toBe(error.message);
  });

  it("translates interface messages while keeping user data literal", () => {
    const t = createTranslator("zh");
    expect(t("Welcome back")).toBe("欢迎回来");
    expect(t("Project: {name}; votes: {count}", { name: "Welcome back {count}", count: 0 }))
      .toBe("Project: Welcome back {count}; votes: 0");
    expect(t("{value}", { value: "<script>alert('x')</script>" }))
      .toBe("<script>alert('x')</script>");
  });

  it("does not interpolate inherited properties and leaves missing placeholders intact", () => {
    const values = Object.assign(Object.create({ secret: "hidden" }), { count: 3 });
    expect(createTranslator("zh")("{secret} {missing} {count}", values))
      .toBe("{secret} {missing} 3");
  });

  it("formats dates in the selected locale with UTC as the default timezone", () => {
    const instant = "2026-10-10T23:30:00-07:00";
    const options = { year: "numeric", month: "long", day: "numeric" } as const;
    for (const locale of ["en", "zh"] as const) {
      const i18n = createI18n(locale);
      expect(i18n.locale).toBe(locale);
      expect(i18n.formatDate(instant, options)).toBe(
        new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", { ...options, timeZone: "UTC" })
          .format(new Date(instant)),
      );
    }
    expect(createI18n("zh").formatDate(instant, options)).toBe("2026年10月11日");
  });
});
