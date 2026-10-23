import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { JsonLd } from "@/components/json-ld";
import { publicPageMetadata, siteUrl } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/shared";

import { ExperienceTabs } from "./experience-tabs";
import { projectExperience, workExperience, type ResumeEntry } from "./resume";
import { projectExperienceEn, workExperienceEn } from "./resume-en";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return publicPageMetadata({ path: "/profile", locale,
    title: t("Nanxuan Li | Frontend Engineer"),
    description: t("Nanxuan Li's frontend development portfolio, featuring professional experience and projects in component libraries, real-time bidding, and web performance optimization."),
  });
}

const skills = [
  "HTML5", "CSS3", "JavaScript", "TypeScript", "Vue 2 / 3", "React 19",
  "Next.js", "Element Plus", "Vite", "Webpack", "Node.js", "MySQL",
  "WebSocket", "Linux", "Nginx", "Docker", "Codex",
];

function ResumeEntries({ entries, locale }: { entries: readonly ResumeEntry[]; locale: Locale }) {
  return (
    <div className="space-y-6" lang={locale === "zh" ? "zh-CN" : "en"}>
      {entries.map((entry) => (
        <article className="min-w-0 border-b border-border pb-6 last:border-0 last:pb-0" key={entry.name}>
          <h3 className="font-semibold">{entry.name}</h3>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground"><span>{entry.role}</span><span>{entry.period}</span></p>
          <div className="mt-4 space-y-3 break-words text-sm leading-7 text-muted-foreground">
            {entry.paragraphs.map((paragraph, index) => (
              <p key={index}>
                {["内容:", "工作内容：", "业绩:", "Overview:", "Responsibilities:", "Achievements:"].includes(paragraph) ? <strong className="font-semibold text-foreground">{paragraph}</strong> : paragraph}
              </p>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

// 按请求语言选择完整简历和联系邮箱；中文保留原文，英文使用逐段核对的专业译文。
export default async function ProfilePage() {
  const { t, locale } = await getI18n();
  const labelSuffix = locale === "zh" ? "：" : ":";
  const email = locale === "en" ? "pegpaul7@gmail.com" : "peg600@sina.com";
  const phone = locale === "en" ? "+86 136 4128 5537" : "13641285537";
  const phoneHref = locale === "en" ? "tel:+8613641285537" : "tel:13641285537";

  return (
    <div className="min-h-svh bg-surface">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ProfilePage", url: siteUrl("/profile"),
        name: t("Nanxuan Li | Frontend Engineer"), inLanguage: locale === "zh" ? "zh-CN" : "en",
        mainEntity: { "@type": "Person", "@id": siteUrl("/profile#person"), name: locale === "zh" ? "李楠煊" : "Nanxuan Li", jobTitle: t("Frontend Engineer"), url: siteUrl("/profile"), image: siteUrl("/li-nanxuan.png") },
      }} />
      <SiteHeader locale={locale} profileActive navigation={[
        { href: "/#features", label: "Features" },
        { href: "/p/demo/roadmap", label: "Roadmap" },
        { href: "/dashboard", label: "Dashboard" },
      ]} />
      <main className="mx-auto grid max-w-content items-start gap-6 px-5 py-8 md:px-8 md:py-12 lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)] lg:gap-8 xl:px-12">
        <div className="min-w-0 space-y-6">
          <section className="rounded-surface border border-border bg-background p-6 text-left md:p-8">
            <Image className="size-20 rounded-full object-cover" src="/li-nanxuan.png" alt={t("Portrait of Nanxuan Li")} width={90} height={90} />
            <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-2 text-sm text-muted-foreground">
              <dt>{t("Name")}{labelSuffix}</dt>
              <dd className="min-w-0"><h1 className="text-2xl font-extrabold text-foreground">{t("Nanxuan Li")}</h1></dd>
              <dt>{t("Target role")}{labelSuffix}</dt>
              <dd className="min-w-0">{t("Frontend Engineer")}</dd>
              <dt>{t("Experience")}{labelSuffix}</dt>
              <dd className="min-w-0">{t("8 years in frontend and full-stack development")}</dd>
              <dt>{t("Preferred city")}{labelSuffix}</dt>
              <dd className="min-w-0">{t("Beijing / Remote")}</dd>
              <dt>{t("Email")}{labelSuffix}</dt>
              <dd className="min-w-0"><a className="break-all underline-offset-4 hover:text-primary hover:underline" href={`mailto:${email}`}>{email}</a></dd>
              <dt>{t("Phone")}{labelSuffix}</dt>
              <dd className="min-w-0"><a className="break-all underline-offset-4 hover:text-primary hover:underline" href={phoneHref}>{phone}</a></dd>
              {locale === "en" && <>
                <dt>{t("Open to")}{labelSuffix}</dt>
                <dd className="min-w-0 leading-6">{t("Remote work with companies worldwide, as a full-time employee or an independent contractor.")}</dd>
              </>}
            </dl>
          </section>
          <section className="rounded-surface border border-border bg-background p-6 md:p-8">
            <h2 className="text-lg font-bold">{t("Technical Skills")}</h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {skills.map((skill) => <li className="rounded-pill bg-surface px-3 py-1.5 text-xs font-medium" key={skill}>{skill}</li>)}
            </ul>
          </section>
          <section className="rounded-surface border border-border bg-background p-6 md:p-8">
            <h2 className="text-lg font-bold">{t("Education")}</h2>
            <h3 className="mt-4 font-semibold">{t("Xidian University")}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Bachelor's degree in Electronic Information Engineering")}</p>
            <p className="mt-2 text-sm text-muted-foreground">2011 – 2015</p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("Passed CET-6 (College English Test, Band 6); comfortable participating in meetings and reading technical documentation in English.")}</p>
          </section>
        </div>
        <div className="min-w-0 space-y-6">
          <section className="rounded-surface border border-border bg-background p-6 md:p-8">
            <h2 className="text-lg font-bold">{t("About Me")}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("Experienced in building web applications, mobile web experiences, and WeChat Mini Programs. My work focuses on real-time trading interfaces, reusable components and hooks, responsive UI development, frontend tooling, and search engine optimization (SEO).")}</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("Hands-on experience configuring and deploying applications with Linux, Nginx, and Docker, and setting up containerized AI environments with CUDA, PyTorch, and Conda. I use Codex to support development and technical research, and contribute to requirements reviews, technical design discussions, and team collaboration.")}</p>
          </section>
          <ExperienceTabs
            label={t("Professional experience")}
            workLabel={t("Work Experience")}
            projectsLabel={t("Projects")}
            work={<ResumeEntries entries={locale === "zh" ? workExperience : workExperienceEn} locale={locale} />}
            projects={<ResumeEntries entries={locale === "zh" ? projectExperience : projectExperienceEn} locale={locale} />}
          />
          <Link className="ui-card ui-card-interactive block bg-background p-6 md:p-8" href="/p/demo" prefetch={false}>
            <h2 className="font-bold">FeedbackFlow</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("A feedback management and public roadmap tool that helps product teams collect user feedback and organize feature requests.")}</p>
            <span className="mt-3 inline-block text-sm font-semibold text-primary">{t("View project →")}</span>
          </Link>
        </div>
      </main>
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-content px-5 py-8 text-sm text-muted-foreground md:px-8 xl:px-12">{t("© 2026 Nanxuan Li. Built with Next.js and TypeScript.")}</div>
      </footer>
    </div>
  );
}
