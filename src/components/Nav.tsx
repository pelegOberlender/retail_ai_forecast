"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Logo } from "./icons/Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/historic-orders", label: "Historic Orders" },
  { href: "/buy-plans", label: "Buy Plans" },
  { href: "/buy-plans/new", label: "New Buy Plan" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-nav/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <Logo className="h-5 w-5" />
          <span className="font-display text-lg">MODO</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm md:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "transition-colors hover:text-foreground",
                  active ? "text-foreground" : "text-foreground-soft"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={clsx(
              "block h-px w-5 bg-foreground transition-transform",
              open && "translate-y-[3.5px] rotate-45"
            )}
          />
          <span
            className={clsx(
              "block h-px w-5 bg-foreground transition-transform",
              open && "-translate-y-[3.5px] -rotate-45"
            )}
          />
        </button>
      </div>

      {open && (
        <nav className="flex flex-col border-t border-hairline px-6 py-4 text-sm md:hidden">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "border-b border-hairline py-3 last:border-0",
                  active ? "text-foreground" : "text-foreground-soft"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
