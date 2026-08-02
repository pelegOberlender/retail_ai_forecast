"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/historic-orders", label: "Historic Orders" },
  { href: "/buy-plans", label: "Buy Plans" },
  { href: "/buy-plans/new", label: "New Buy Plan" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-nav/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 19L9 9.5L12.5 14.5L21 3"
              stroke="var(--accent)"
              strokeWidth="2.6"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
          <span className="font-display text-base">MODO</span>
        </Link>

        <nav className="hidden items-center gap-8 text-xs md:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "tracking-label transition-colors hover:text-accent",
                  active ? "text-accent" : "text-foreground-soft"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
