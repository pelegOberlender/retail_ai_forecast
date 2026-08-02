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
        "rounded-2xl border border-hairline bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
        className
      )}
    >
      {children}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  accent: "bg-accent text-accent-ink hover:bg-accent-dark",
  light: "bg-foreground text-background hover:bg-foreground/90",
  outline: "border border-hairline-strong text-foreground hover:bg-surface-hover",
  ghost: "text-foreground-soft hover:text-foreground hover:bg-surface-hover",
};

export function Button({
  className,
  variant = "outline",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={clsx(buttonBase, variants[variant], className)} {...props} />;
}

export function LinkButton({
  href,
  className,
  variant = "outline",
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
  tone?: "neutral" | "accent" | "green" | "red";
}) {
  const tones = {
    neutral: "bg-surface-hover text-foreground-soft border border-hairline",
    accent: "bg-accent text-accent-ink",
    green: "bg-tone-green/15 text-tone-green border border-tone-green/30",
    red: "bg-tone-red/15 text-tone-red border border-tone-red/30",
  };
  return (
    <span
      className={clsx(
        "tracking-label inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="tracking-label text-xs text-foreground-soft">{label}</div>
      <div className="mt-2 font-display text-3xl text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-foreground-soft">{hint}</div>}
    </Card>
  );
}
