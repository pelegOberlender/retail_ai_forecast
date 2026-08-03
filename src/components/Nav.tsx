"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  Archive,
  BarChart3,
  ChevronRight,
  ClipboardList,
  History,
  Menu,
  Plus,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./icons/Logo";

type AppLink = { href: string; label: string; icon: LucideIcon };

const LINKS: AppLink[] = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/buy-plans", label: "Buy plans", icon: ClipboardList },
  { href: "/catalogs", label: "Catalogs", icon: Archive },
  { href: "/historic-orders", label: "Historical data", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function currentSection(pathname: string) {
  return LINKS.find((link) => isActive(pathname, link.href)) ?? LINKS[0];
}

export default function Nav({ userEmail = null }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const section = currentSection(pathname);

  if (isAuthRoute) {
    return (
      <header className="auth-nav border-b border-hairline bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6 sm:px-10">
          <Link href="/" className="inline-flex items-center gap-2.5 text-foreground focus-ring">
            <Logo className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-[-0.02em]">MODO</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <div className="app-shell-nav">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col bg-ink-band text-white md:flex">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <Link href="/" className="inline-flex items-center gap-3 focus-ring-dark">
            <span className="grid h-9 w-9 place-items-center rounded-[4px] bg-white text-ink-band">
              <Logo className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-[-0.03em]">MODO</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-white/45">Buying intelligence</span>
            </span>
          </Link>
        </div>

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 py-6">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "group flex min-h-11 items-center gap-3 rounded-[4px] px-3 text-sm transition-colors focus-ring-dark",
                  active ? "bg-white text-ink-band" : "text-white/62 hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon aria-hidden="true" className={clsx("h-[17px] w-[17px]", active ? "text-accent-dark" : "text-white/45 group-hover:text-white/75")} />
                {link.label}
              </Link>
            );
          })}

          <div className="mt-5 border-t border-white/10 pt-5">
            <Link href="/buy-plans/new" className="flex min-h-11 items-center justify-between rounded-[4px] bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-dark focus-ring-dark">
              New buy plan
              <Plus aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.13em] text-white/38">Signed in</p>
          <p className="mt-1 truncate text-xs text-white/68">{userEmail ?? "MODO workspace"}</p>
        </div>
      </aside>

      <header className="fixed left-[248px] right-0 top-0 z-40 hidden h-16 items-center justify-between border-b border-hairline bg-background/94 px-8 backdrop-blur md:flex">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Link href="/" className="focus-ring text-foreground-soft transition-colors hover:text-foreground">Workspace</Link>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-hairline-strong" />
          <span className="truncate font-medium text-foreground">{section.label}</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-xs text-foreground-soft">Israel market · IL</span>
          <Link href="/buy-plans/new" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-[4px] bg-ink-band px-4 text-xs font-medium text-white transition-colors hover:bg-accent-dark">
            <Plus aria-hidden="true" className="h-4 w-4" />
            New plan
          </Link>
        </div>
      </header>

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-hairline bg-white/94 px-5 backdrop-blur md:hidden">
        <Link href="/" className="inline-flex items-center gap-2.5 focus-ring">
          <Logo className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-[-0.02em]">MODO</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className="grid h-11 w-11 place-items-center rounded-[4px] border border-hairline bg-white focus-ring"
        >
          {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </header>

      {open && (
        <nav id="mobile-navigation" aria-label="Mobile primary" className="fixed inset-x-0 top-16 z-40 border-b border-hairline bg-white px-5 py-3 shadow-[var(--shadow-menu)] md:hidden">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={clsx("flex min-h-12 items-center gap-3 border-b border-hairline px-1 text-sm last:border-0 focus-ring", active ? "font-medium text-foreground" : "text-foreground-soft")}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          <Link href="/buy-plans/new" onClick={() => setOpen(false)} className="focus-ring mt-3 flex min-h-11 items-center justify-center gap-2 rounded-[4px] bg-accent px-4 text-sm font-medium text-white">
            <Plus aria-hidden="true" className="h-4 w-4" /> New buy plan
          </Link>
        </nav>
      )}
    </div>
  );
}
