"use client";

import type { ReactNode } from "react";
import { Tabs } from "radix-ui";

type ExperienceTabsProps = {
  label: string;
  workLabel: string;
  projectsLabel: string;
  work: ReactNode;
  projects: ReactNode;
};

const triggerClassName = "min-w-0 flex-1 cursor-pointer border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-primary";

// 用既有 Radix 原语管理标签选中状态和键盘焦点；完整经历内容由服务端作为插槽传入。
export function ExperienceTabs({ label, workLabel, projectsLabel, work, projects }: ExperienceTabsProps) {
  return (
    <Tabs.Root defaultValue="work" className="min-w-0 rounded-surface border border-border bg-background p-6 md:p-8">
      <Tabs.List aria-label={label} className="mb-6 flex border-b border-border">
        <Tabs.Trigger value="work" className={triggerClassName}>{workLabel}</Tabs.Trigger>
        <Tabs.Trigger value="projects" className={triggerClassName}>{projectsLabel}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="work" className="outline-none focus-visible:ring-2 focus-visible:ring-primary">{work}</Tabs.Content>
      <Tabs.Content value="projects" className="outline-none focus-visible:ring-2 focus-visible:ring-primary">{projects}</Tabs.Content>
    </Tabs.Root>
  );
}
