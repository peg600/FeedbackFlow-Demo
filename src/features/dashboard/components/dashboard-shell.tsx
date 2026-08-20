"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { iconPaths } from "@/lib/icons";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/settings", label: "Project settings" },
  { href: "/dashboard/billing", label: "Billing" },
] as const;

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type DashboardShellProps = {
  children: ReactNode;
  project: { name: string; slug: string };
  user: { email: string; name: string };
};

export function DashboardShell({ children, project, user }: DashboardShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const navigation = (
    <nav aria-label="Dashboard navigation" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className="ui-sidebar-item px-3 py-2 text-[13px] font-semibold"
            href={item.href}
            key={item.href}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-svh bg-surface">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-sidebar flex-col justify-between border-r border-border bg-background p-5 lg:flex">
        <div className="flex flex-col gap-6">
          <Brand className="gap-2 [&_span]:text-base" />
          <section aria-label="Current workspace" className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold tracking-wide text-muted-foreground">WORKSPACE</p>
            <div className="flex min-w-0 items-center gap-2 rounded-placeholder bg-surface p-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-brand text-[10px] font-bold text-primary">
                {initials(project.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{project.name}</span>
                <span className="block text-[10px] text-muted-foreground">Free plan</span>
              </span>
            </div>
          </section>
          {navigation}
          <section className="flex flex-col gap-3 pt-3 text-xs font-semibold text-text">
            <p className="text-[10px] font-bold tracking-wide text-muted-foreground">PUBLIC PROJECT</p>
            <Link href={`/p/${project.slug}`} target="_blank">View feedback board ↗</Link>
            <Link href={`/p/${project.slug}/roadmap`} target="_blank">View roadmap ↗</Link>
          </section>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2 rounded-placeholder bg-surface p-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-success text-[10px] font-bold text-success">
              {initials(user.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">{user.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{user.email}</span>
            </span>
          </div>
          <SignOutButton className="w-full [&_button]:w-full" compact />
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:pl-sidebar">
        <header className="flex h-[72px] items-center justify-between border-b border-border bg-background px-5 md:px-6 lg:hidden">
          <Brand className="gap-2" />
          <div className="hidden items-center gap-2 md:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-success text-[10px] font-bold text-success">{initials(user.name)}</span>
            <span className="text-sm font-semibold">{user.name}</span>
            <SignOutButton compact />
          </div>
          <button
            aria-controls="mobile-dashboard-menu"
            aria-expanded={menuOpen}
            aria-label="Open dashboard menu"
            className="flex size-10 items-center justify-center rounded-control bg-surface-hover md:hidden"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Image alt="" height={22} src={iconPaths.menu} width={22} />
          </button>
        </header>
        <div className="hidden border-b border-border bg-background px-6 md:block lg:hidden">
          <nav aria-label="Dashboard navigation" className="flex gap-1">
            {navItems.map((item) => (
              <Link
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors duration-200 hover:bg-surface-hover hover:text-foreground",
                  pathname === item.href && "border-primary text-primary",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {children}
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close dashboard menu"
            className="absolute inset-0 bg-backdrop"
            onClick={() => setMenuOpen(false)}
            type="button"
          />
          <div
            aria-label="Dashboard menu"
            aria-modal="true"
            className="animate-drawer-in relative flex h-full w-[min(82vw,320px)] flex-col gap-7 bg-background p-5 shadow-xl"
            id="mobile-dashboard-menu"
            role="dialog"
          >
            <div className="flex items-center justify-between">
              <Brand className="gap-2" />
              <Button
                onClick={() => setMenuOpen(false)}
                size="small"
                variant="secondary"
              >
                Close
              </Button>
            </div>
            <div className="rounded-placeholder bg-surface p-3 text-sm font-semibold">{project.name}</div>
            {navigation}
            <div className="mt-auto flex flex-col gap-4">
              <Link href={`/p/${project.slug}`}>View feedback board ↗</Link>
              <Link href={`/p/${project.slug}/roadmap`}>View roadmap ↗</Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
