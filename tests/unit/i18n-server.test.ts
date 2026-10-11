import { beforeEach, describe, expect, it, vi } from "vitest";

import { LOCALE_COOKIE } from "@/lib/i18n/shared";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
vi.unmock("@/lib/i18n/server");

import { getI18n } from "@/lib/i18n/server";

describe("request locale", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the language preference from the dedicated cookie", async () => {
    mocks.get.mockReturnValue({ value: "zh" });
    const i18n = await getI18n();
    expect(mocks.get).toHaveBeenCalledWith(LOCALE_COOKIE);
    expect(i18n.locale).toBe("zh");
    expect(i18n.t("Welcome back")).toBe("欢迎回来");
  });

  it.each([undefined, { value: "unsupported" }, { value: "zh-CN" }])(
    "uses English for absent or malformed preferences %j",
    async (cookie) => {
      mocks.get.mockReturnValue(cookie);
      expect((await getI18n()).locale).toBe("en");
    },
  );
});
