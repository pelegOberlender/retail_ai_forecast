"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, animate, useReducedMotion } from "motion/react";

export type Stat = {
  tag: string;
  value: number;
  label: string;
  decimals?: number;
  suffix?: string;
};

function formatStat(n: number, decimals = 0, suffix = "") {
  const str = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return `${str}${suffix}`;
}

function StatNumber({
  value,
  decimals,
  suffix,
  delay,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;

    if (reduceMotion) {
      node.textContent = formatStat(value, decimals, suffix);
      return;
    }

    const controls = animate(0, value, {
      duration: 1.1,
      delay,
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = formatStat(v, decimals, suffix);
      },
    });
    return () => controls.stop();
  }, [inView, value, decimals, suffix, delay, reduceMotion]);

  return (
    <div ref={ref} className="font-display mt-4 text-3xl text-foreground sm:text-4xl">
      {formatStat(0, decimals, suffix)}
    </div>
  );
}

export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.tag}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
        >
          <span className="tracking-label inline-block rounded-full border border-hairline-strong px-3 py-1 text-[10px] text-foreground-soft">
            {s.tag}
          </span>
          <StatNumber value={s.value} decimals={s.decimals} suffix={s.suffix} delay={i * 0.08} />
          <div className="mt-1 text-sm text-foreground-soft">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
