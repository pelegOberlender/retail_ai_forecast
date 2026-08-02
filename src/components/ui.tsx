import clsx from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-hairline bg-white/60 shadow-[0_1px_2px_rgba(28,25,23,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary: "bg-cream-card text-ink hover:bg-cream-card-hover border border-hairline",
  dark: "bg-ink text-cream hover:bg-ink/90",
  ghost: "text-ink-soft hover:text-ink hover:bg-cream-card",
  outline: "border border-hairline text-ink hover:bg-cream-card",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={clsx(buttonBase, variants[variant], className)} {...props} />;
}

export function LinkButton({
  href,
  className,
  variant = "primary",
  children,
}: {
  href: string;
  className?: string;
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={clsx(buttonBase, variants[variant], className)}>
      {children}
    </Link>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "green" | "red";
}) {
  const tones = {
    neutral: "bg-cream-card text-ink-soft",
    gold: "bg-gold-soft/60 text-gold-dark",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-2 font-serif-display text-2xl text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-soft">{hint}</div>}
    </Card>
  );
}
