"use client";

import { useEffect, useRef } from "react";
import { useInView, animate, useReducedMotion } from "motion/react";

export type CategoryStat = { category: string; pct: number };

function CategoryBar({ category, pct, delay }: { category: string; pct: number; delay: number }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(rowRef, { once: true, margin: "-60px" });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;

    if (reduceMotion) {
      if (fillRef.current) fillRef.current.style.width = `${Math.min(100, pct)}%`;
      if (numberRef.current) numberRef.current.textContent = `${pct.toFixed(1)}%`;
      return;
    }

    const controls = animate(0, pct, {
      duration: 1,
      delay,
      ease: "easeOut",
      onUpdate: (v) => {
        if (fillRef.current) fillRef.current.style.width = `${Math.min(100, v)}%`;
        if (numberRef.current) numberRef.current.textContent = `${v.toFixed(1)}%`;
      },
    });
    return () => controls.stop();
  }, [inView, pct, delay, reduceMotion]);

  return (
    <div ref={rowRef}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-foreground">{category}</span>
        <span ref={numberRef} className="font-display text-foreground">
          0.0%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div ref={fillRef} className="h-full rounded-full bg-accent" style={{ width: "0%" }} />
      </div>
    </div>
  );
}

export function CategoryBars({ categories }: { categories: CategoryStat[] }) {
  return (
    <div className="flex flex-col gap-5">
      {categories.map((c, i) => (
        <CategoryBar key={c.category} category={c.category} pct={c.pct} delay={i * 0.09} />
      ))}
    </div>
  );
}
