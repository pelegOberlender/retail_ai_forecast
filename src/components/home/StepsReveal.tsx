"use client";

import Link from "next/link";
import clsx from "clsx";
import { motion } from "motion/react";

export type Step = {
  step: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

function ArrowRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14m0 0l-6-6m6 6l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function StepsReveal({ steps }: { steps: Step[] }) {
  return (
    <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
      {steps.map((s, i) => {
        const emphasized = i === 1;
        return (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
            className={clsx(emphasized && "sm:-mt-4")}
          >
            <span
              className={clsx(
                "font-display block",
                emphasized ? "text-4xl text-accent-dark" : "text-3xl text-hairline-strong"
              )}
            >
              {s.step}
            </span>
            <h3 className="font-display mt-3 text-lg text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm text-foreground-soft">{s.description}</p>
            <Link
              href={s.href}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent-dark transition-colors hover:text-foreground"
            >
              {s.cta}
              <ArrowRight />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
