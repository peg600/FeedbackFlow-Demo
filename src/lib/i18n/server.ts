import { cookies } from "next/headers";
import { cache } from "react";

import { createI18n, LOCALE_COOKIE, parseLocale } from "./shared";

/** 每个请求读取经过白名单解析的语言 Cookie，供服务端页面、Metadata 与客户端初值共用。 */
export const getI18n = cache(async () => {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return createI18n(locale);
});
