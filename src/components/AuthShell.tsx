"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
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
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(22rem,42%)_1fr] xl:grid-cols-[minmax(25rem,38%)_1fr]">
      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, clipPath: "inset(0 8% 0 0)" }}
        animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden min-h-[calc(100dvh-4rem)] overflow-hidden bg-ink-band lg:block"
      >
        <motion.div
          initial={reduceMotion ? false : { scale: 1.045 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={heroImage}
            alt="Fashion buyers reviewing a seasonal collection in a showroom"
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1280px) 38vw, 42vw"
            className="object-cover object-[61%_center]"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-ink-band/75" />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-8 bottom-8 border-t border-white/30 pt-5 xl:inset-x-10 xl:bottom-10"
        >
          <p className="max-w-sm text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
            Buying intelligence
          </p>
          <p className="mt-2 max-w-sm font-display text-[clamp(1.75rem,2.2vw,2.5rem)] leading-[1.02] text-white">
            Plan the collection with evidence and instinct.
          </p>
        </motion.div>
      </motion.aside>

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center bg-background px-6 py-12 sm:px-12 lg:px-[clamp(4rem,8vw,9rem)]"
      >
        <div className="w-full max-w-[31rem]">
          <p className="tracking-label mb-5 text-[10px] font-semibold text-accent-dark">MODO workspace</p>
          <h1 className="font-display text-[clamp(2.5rem,4.2vw,3.75rem)] text-foreground">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-foreground-soft">{description}</p>
          <div className="mt-9 border-y border-hairline bg-white px-5 py-7 sm:px-7">{children}</div>
          <div className="mt-6 text-sm text-foreground-soft">{footer}</div>
        </div>
      </motion.section>
    </div>
  );
}
