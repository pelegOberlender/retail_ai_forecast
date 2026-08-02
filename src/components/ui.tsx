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
    <div className={clsx("rounded-xl border border-hairline bg-surface", className)}>
      {children}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  light: "bg-foreground text-background hover:bg-foreground/88",
  outline: "border border-hairline-strong text-foreground hover:bg-surface-hover",
  accent: "border border-accent/50 text-accent hover:bg-accent/10",
  ghost: "text-foreground-soft hover:text-foreground",
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
    neutral: "border border-hairline-strong text-foreground-soft",
    accent: "border border-accent/40 text-accent",
    green: "border border-tone-green/35 text-tone-green",
    red: "border border-tone-red/35 text-tone-red",
  };
  return (
    <span
      className={clsx(
        "tracking-label inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium",
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
      <div className="font-display mt-2 text-2xl text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-foreground-soft">{hint}</div>}
    </Card>
  );
}
