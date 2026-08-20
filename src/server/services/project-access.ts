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
