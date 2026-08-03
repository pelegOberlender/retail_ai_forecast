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
    <div className={clsx("rounded-xl border border-hairline bg-white", className)}>
      {children}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  dark: "bg-ink-band text-white hover:bg-ink-band/88",
  outline: "border border-hairline-strong bg-white text-foreground hover:bg-surface",
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
    <Card className="p-4 sm:p-5">
      <div className="tracking-label text-xs text-foreground-soft">{label}</div>
      <div className="font-display mt-1.5 text-2xl text-foreground">{value}</div>
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
