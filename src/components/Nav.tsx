"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Logo } from "./icons/Logo";

const LINKS = [
  { href: "/", label: "Overview", shortLabel: "OV" },
  { href: "/historic-orders", label: "Historical data", shortLabel: "HD" },
  { href: "/buy-plans", label: "Buy plans", shortLabel: "BP" },
];

export default function Nav({ userEmail = null }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAuthRoute = pathname === "/login" || pathname === "/register";

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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-ink-band text-white md:flex">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <Link href="/" className="inline-flex items-center gap-3 focus-ring-dark">
            <span className="grid h-9 w-9 place-items-center rounded-[4px] bg-white text-ink-band">
              <Logo className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-[-0.03em]">MODO</span>
              <span className="block text-[10px] uppercase tracking-[0.14em] text-white/45">
                Buying intelligence
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 py-6">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
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
                <span
                  aria-hidden="true"
                  className={clsx(
                    "grid h-6 w-7 place-items-center rounded-[3px] font-mono text-[9px] font-semibold tracking-[0.08em]",
                    active ? "bg-accent-soft text-accent-dark" : "bg-white/8 text-white/48 group-hover:text-white/70"
                  )}
                >
                  {link.shortLabel}
                </span>
                {link.label}
              </Link>
            );
          })}

          <div className="mt-5 border-t border-white/10 pt-5">
            <Link
              href="/buy-plans/new"
              className="flex min-h-11 items-center justify-between rounded-[4px] bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-dark focus-ring-dark"
            >
              New buy plan
              <span aria-hidden="true" className="text-lg leading-none">+</span>
            </Link>
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.13em] text-white/38">Signed in</p>
          <p className="mt-1 truncate text-xs text-white/68">{userEmail ?? "MODO workspace"}</p>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-hairline bg-white/92 px-5 backdrop-blur md:hidden">
        <Link href="/" className="inline-flex items-center gap-2.5 focus-ring">
          <Logo className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-[-0.02em]">MODO</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/buy-plans/new"
            className="inline-flex h-11 items-center rounded-[4px] bg-accent px-4 text-sm font-medium text-white focus-ring"
          >
            New plan
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-[4px] border border-hairline bg-white focus-ring"
          >
            <span className={clsx("block h-px w-5 bg-foreground transition-transform", open && "translate-y-[3.5px] rotate-45")} />
            <span className={clsx("block h-px w-5 bg-foreground transition-transform", open && "-translate-y-[3.5px] -rotate-45")} />
          </button>
        </div>
      </header>

      {open && (
        <nav aria-label="Mobile primary" className="fixed inset-x-0 top-16 z-30 border-b border-hairline bg-white px-5 py-3 shadow-[var(--shadow-menu)] md:hidden">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-h-12 items-center justify-between border-b border-hairline px-1 text-sm last:border-0 focus-ring",
                  active ? "font-medium text-foreground" : "text-foreground-soft"
                )}
              >
                {link.label}
                <span aria-hidden="true">→</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
