import type { ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { requireDashboardAccess } from "@/server/services/project-access";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { project, session } = await requireDashboardAccess();

  return (
    <DashboardShell
      project={{ name: project.name, slug: project.slug }}
      user={{ email: session.user.email, name: session.user.name }}
    >
      {children}
    </DashboardShell>
  );
}
