import type { ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { requireDashboardAccess } from "@/server/services/project-access";

// 验证当前布局的会话和项目访问资格，并向控制台外壳传递服务端读取的用户与项目信息。
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
