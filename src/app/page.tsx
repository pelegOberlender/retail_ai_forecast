import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui";

export default async function Home() {
  const [orderCount, quarterRows, avgSellThrough, planCount, topCategories] = await Promise.all([
    prisma.historicOrder.count(),
    prisma.historicOrder.findMany({ distinct: ["season"], select: { season: true } }),
    prisma.historicOrder.aggregate({ _avg: { sellThroughPct: true } }),
    prisma.buyPlan.count(),
    prisma.historicOrder.groupBy({
      by: ["category"],
      _avg: { sellThroughPct: true },
      orderBy: { _avg: { sellThroughPct: "desc" } },
      take: 4,
    }),
  ]);

  const stats = [
    { tag: "HISTORY", value: orderCount.toLocaleString(), label: "Order records" },
    { tag: "COVERAGE", value: String(quarterRows.length), label: "Quarters tracked" },
    { tag: "PERFORMANCE", value: `${(avgSellThrough._avg.sellThroughPct ?? 0).toFixed(1)}%`, label: "Avg. sell-through" },
    { tag: "OUTPUT", value: String(planCount), label: "Buy plans created" },
  ];

  const steps = [
    {
      step: "01",
      title: "Manage historic orders",
      description: "Browse, filter, and export every past order: quantities, sell-through, and revenue by SKU, category, and quarter.",
      href: "/historic-orders",
      cta: "Open historic orders",
    },
    {
      step: "02",
      title: "Create a buy plan",
      description: "Upload next quarter's catalog. The engine matches each item against comparable history and trend signal to recommend quantities.",
      href: "/buy-plans/new",
      cta: "Start a new buy plan",
    },
    {
      step: "03",
      title: "Review, lock, export",
      description: "Adjust recommended quantities line by line, lock the plan when it's final, and export a ready-to-send Excel file.",
      href: "/buy-plans",
      cta: "View buy plans",
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[600px] items-center justify-center overflow-hidden border-b border-hairline bg-gradient-to-b from-[#e9e3d0] to-[#f7f4ea] sm:min-h-[720px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/hero.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
          <h1 className="font-display text-5xl leading-tight text-white sm:text-6xl">
            A buy plan built on your retail data
          </h1>
          <p className="max-w-xl text-balance text-lg text-white/85">
            Upload next quarter&apos;s catalog and get a buy plan built from your own sales
            history and current trend signal.
          </p>
          <LinkButton href="/buy-plans/new" variant="accent" className="mt-2 px-7 py-3.5 text-[15px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Upload your catalog
          </LinkButton>
        </div>
      </section>

      <section className="border-b border-hairline bg-white px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.tag}>
              <span className="tracking-label inline-block rounded-full border border-hairline-strong px-3 py-1 text-[10px] text-foreground-soft">
                {s.tag}
              </span>
              <div className="font-display mt-4 text-3xl text-foreground sm:text-4xl">{s.value}</div>
              <div className="mt-1 text-sm text-foreground-soft">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-24 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
        <div>
          <h2 className="font-display text-2xl text-foreground sm:text-3xl">How MODO works</h2>
          <p className="mt-3 max-w-sm text-foreground-soft">
            Three tools, one quarterly workflow. From what sold last time to what to buy next
            time.
          </p>
        </div>

        <div className="divide-y divide-hairline border-t border-hairline">
          {steps.map((s) => (
            <div key={s.step} className="grid gap-4 py-8 sm:grid-cols-[64px_1fr_auto] sm:items-center sm:gap-6">
              <span className="font-display text-2xl text-hairline-strong">{s.step}</span>
              <div>
                <h3 className="font-display text-lg text-foreground">{s.title}</h3>
                <p className="mt-2 max-w-xl text-sm text-foreground-soft">{s.description}</p>
              </div>
              <LinkButton href={s.href} variant="outline" className="w-fit px-4 py-2 text-xs sm:justify-self-end">
                {s.cta}
              </LinkButton>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-hairline bg-white px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-xl text-foreground sm:text-2xl">Top categories by sell-through</h2>
          <div className="mt-8 flex flex-col gap-5">
            {topCategories.map((c) => {
              const pct = c._avg.sellThroughPct ?? 0;
              return (
                <div key={c.category}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-foreground">{c.category}</span>
                    <span className="font-display text-foreground">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-foreground-soft">
            From {orderCount.toLocaleString()} historic orders across {quarterRows.length} quarters.
          </p>
        </div>
      </section>

      <section className="border-t border-hairline bg-ink-band px-6 py-20 text-center sm:px-10">
        <h2 className="font-display text-3xl text-white">Ready to plan next quarter?</h2>
        <p className="mx-auto mt-3 max-w-lg text-white/70">
          Upload your catalog and get a recommended buy plan grounded in your own sales history.
        </p>
        <div className="mt-7">
          <LinkButton href="/buy-plans/new" variant="accent" className="px-6 py-3 text-[15px]">
            Upload your catalog
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
