"use client";

import { motion } from "motion/react";
import { LinkButton } from "@/components/ui";

export function CtaBandReveal({
  heading,
  description,
  ctaHref,
  ctaLabel,
}: {
  heading: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mx-auto flex max-w-6xl flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h2 className="font-display text-3xl text-white sm:text-4xl">{heading}</h2>
        <p className="mt-3 max-w-md text-white/70">{description}</p>
      </div>
      <LinkButton href={ctaHref} variant="accent" className="shrink-0 px-6 py-3 text-[15px]">
        {ctaLabel}
      </LinkButton>
    </motion.div>
  );
}
