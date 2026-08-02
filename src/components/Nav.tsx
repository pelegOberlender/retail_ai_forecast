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
    <header className="sticky top-0 z-40 border-b border-hairline bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 19L9 9.5L12.5 14.5L21 3"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
          <span className="font-serif-display text-lg tracking-wide">MODO</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-ink-soft md:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "transition-colors hover:text-ink",
                  active && "text-ink font-medium"
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
