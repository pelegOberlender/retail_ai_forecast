"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { LinkButton } from "@/components/ui";
import heroPhoto from "../../../public/hero.jpg";

export function HeroReveal({
  headline,
  description,
  ctaHref,
  ctaLabel,
}: {
  headline: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const reduceMotion = useReducedMotion();

  const textVariants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, delay: reduceMotion ? 0 : 0.1 + i * 0.1, ease: "easeOut" },
    }),
  };

  return (
    <section className="grid overflow-hidden border-b border-hairline bg-gradient-to-b from-[#e9e3d0] to-[#f7f4ea] lg:grid-cols-2">
      <div className="flex flex-col justify-center gap-5 px-6 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-0 xl:px-20">
        <motion.h1
          custom={0}
          initial="hidden"
          animate="show"
          variants={textVariants}
          className="font-display max-w-lg text-4xl leading-tight text-foreground sm:text-5xl"
        >
          {headline}
        </motion.h1>
        <motion.p
          custom={1}
          initial="hidden"
          animate="show"
          variants={textVariants}
          className="max-w-md text-lg text-foreground-soft"
        >
          {description}
        </motion.p>
        <motion.div custom={2} initial="hidden" animate="show" variants={textVariants} className="mt-2">
          <LinkButton href={ctaHref} variant="accent" className="px-7 py-3.5 text-[15px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {ctaLabel}
          </LinkButton>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative aspect-square"
      >
        <Image
          src={heroPhoto}
          alt="Three models wearing looks planned with MODO"
          fill
          priority
          placeholder="blur"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-ink-band/[0.08] mix-blend-multiply" />
      </motion.div>
    </section>
  );
}
