import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
type Project = typeof projects.$inferSelect;

type CurrentProjectAccess = {
  project: Project | null;
  session: Session | null;
};

/** 在当前服务端渲染范围内复用会话及所属项目查询，区分未登录和尚未创建项目。 */
export const getCurrentProjectAccess = cache(async (): Promise<CurrentProjectAccess> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { project: null, session: null };
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1);

  return { project: project ?? null, session: session as Session };
});

/** 为后台入口验证访问资格：未登录跳转登录，无项目跳转引导页，否则返回会话和项目。 */
export const requireDashboardAccess = cache(async () => {
  const access = await getCurrentProjectAccess();

  if (!access.session) {
    redirect("/login?returnTo=/dashboard");
  }

  if (!access.project) {
    redirect("/onboarding");
  }

  return { project: access.project, session: access.session };
});
