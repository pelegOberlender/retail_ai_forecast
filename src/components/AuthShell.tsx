import Image from "next/image";
import type { ReactNode } from "react";
import heroImage from "../../public/modo-fashion-intelligence-hero.png";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden min-h-[calc(100dvh-4rem)] overflow-hidden bg-ink-band lg:block">
        <Image
          src={heroImage}
          alt="Fashion buyers reviewing a seasonal collection in a showroom"
          fill
          priority
          placeholder="blur"
          sizes="55vw"
          className="object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-band/55 via-transparent to-transparent" />
        <p className="absolute bottom-10 left-10 max-w-md font-display text-4xl leading-[1.02] text-white">
          Plan the collection with evidence and instinct.
        </p>
      </div>

      <div className="flex items-center bg-background px-6 py-12 sm:px-12 lg:px-16">
        <div className="w-full max-w-md">
          <h1 className="font-display text-5xl text-foreground sm:text-6xl">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-foreground-soft">{description}</p>
          <div className="mt-9 border-y border-hairline bg-white px-5 py-7 sm:px-7">{children}</div>
          <div className="mt-6 text-sm text-foreground-soft">{footer}</div>
        </div>
      </div>
    </div>
  );
}
