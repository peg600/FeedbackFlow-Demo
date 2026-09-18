import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicProjectHeader } from "@/features/feedback/components/public-project-header";
import { getPublicRoadmap } from "@/server/services/public-roadmap";

type Props = { params: Promise<{ slug: string }> };
const laneMeta = {
  planned: { label: "Planned", tone: "bg-surface-warning text-warning-foreground" },
  in_progress: { label: "In progress", tone: "bg-surface-info text-info" },
  completed: { label: "Completed", tone: "bg-surface-success text-success" },
} as const;

// 根据公开项目生成路线图 SEO 信息，不存在时返回明确的未找到标题。
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicRoadmap(slug);
  return data ? { title: `${data.project.name} roadmap | FeedbackFlow`, description: `Public roadmap for ${data.project.name}.` } : { title: "Roadmap not found | FeedbackFlow" };
}

// 读取由反馈状态派生的公开路线图，并按 Planned、In progress、Completed 三列展示。
export default async function RoadmapPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicRoadmap(slug);
  if (!data) notFound();
  return <div className="min-h-svh bg-surface"><PublicProjectHeader active="roadmap" project={data.project} /><main className="mx-auto max-w-content px-5 py-8 md:px-8 md:py-10 xl:px-12"><h1 className="text-2xl font-bold md:text-[28px]">Public roadmap</h1><p className="mt-2 text-[13px] text-muted-foreground">See what is planned, in progress, and recently completed.</p><div className="mt-8 grid gap-5 lg:grid-cols-3">{data.lanes.map((lane) => { const meta = laneMeta[lane.status]; return <section className="rounded-surface border border-border bg-background p-5" key={lane.status}><div className="mb-5 h-1 rounded-pill bg-surface-hover" /><div className="mb-5 flex items-center justify-between"><h2 className="font-bold">{meta.label}</h2><span className={`rounded-pill px-3 py-1 text-[11px] font-bold ${meta.tone}`}>{lane.items.length} items</span></div><div className="grid gap-4">{lane.items.length ? lane.items.map((item) => <Link className="ui-card ui-card-interactive block bg-surface p-5" href={`/p/${slug}/feedback/${item.id}`} key={item.id}><h3 className="text-sm font-bold">{item.title}</h3><div className="mt-5 flex justify-between text-[11px] text-muted-foreground"><span>{item.voteCount} votes</span><span>Updated {item.updatedAt.toLocaleDateString("en", { month: "short", day: "numeric" })}</span></div></Link>) : <div className="rounded-placeholder bg-surface p-6 text-center text-sm text-muted-foreground">No {meta.label.toLowerCase()} items yet.</div>}</div></section>; })}</div><p className="mt-8 text-[11px] text-muted-foreground">Roadmap columns are derived from feedback status; cards are not manually dragged.</p></main></div>;
}
