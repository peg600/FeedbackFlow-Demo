import type { Metadata } from "next";

import { ProjectSettingsForm } from "@/features/projects/components/project-settings-form";
import { requireDashboardAccess } from "@/features/projects/server/access";

export const metadata: Metadata = { title: "Project settings | FeedbackFlow" };

// 在服务端验证控制台访问权限，并只把当前用户拥有的项目数据交给设置表单。
export default async function SettingsPage() {
  const { project } = await requireDashboardAccess();
  return <main><header className="border-b border-border px-5 py-7 md:px-8 lg:px-12"><h1 className="text-2xl font-bold md:text-[28px]">Project settings</h1><p className="mt-1 text-[13px] text-muted-foreground">Manage how the workspace appears publicly.</p></header><div className="p-5 md:p-8 lg:px-12"><section className="mx-auto max-w-5xl rounded-surface border border-border bg-background p-6 md:p-8"><h2 className="text-lg font-bold">General information</h2><p className="mt-1 mb-7 text-xs text-muted-foreground">Changes update the public feedback board immediately.</p><ProjectSettingsForm project={project} /></section></div></main>;
}
