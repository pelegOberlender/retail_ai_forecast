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
    <div className={clsx("rounded-panel border border-hairline bg-white", className)}>
      {children}
    </div>
  );
}

const buttonBase =
  "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const variants = {
  dark: "bg-ink-band text-white hover:bg-ink-band/88",
  outline: "border border-hairline-strong bg-white text-foreground hover:border-foreground/25 hover:bg-surface",
  accent: "bg-accent text-accent-ink hover:bg-accent-dark",
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
    accent: "bg-accent-soft text-accent-dark",
    green: "border border-tone-green/30 text-tone-green",
    red: "border border-tone-red/30 text-tone-red",
  };
  return (
    <span
      className={clsx(
        "tracking-label inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-semibold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="tracking-label text-[10px] font-semibold text-foreground-soft">{label}</div>
      <div className="mt-2 font-mono text-2xl font-medium tracking-[-0.04em] text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-foreground-soft">{hint}</div>}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon && <div className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline-strong text-foreground-soft">{icon}</div>}
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-foreground-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}
