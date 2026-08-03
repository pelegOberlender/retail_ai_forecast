import { prisma } from "@/lib/prisma";
import { HeroReveal } from "@/components/home/HeroReveal";
import { StatsRow, type Stat } from "@/components/home/StatsRow";
import { CategoryBars } from "@/components/home/CategoryBars";
import { StepsReveal, type Step } from "@/components/home/StepsReveal";
import { CtaBandReveal } from "@/components/home/CtaBandReveal";

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

  const stats: Stat[] = [
    { tag: "HISTORY", value: orderCount, label: "Order records" },
    { tag: "COVERAGE", value: quarterRows.length, label: "Quarters tracked" },
    {
      tag: "PERFORMANCE",
      value: avgSellThrough._avg.sellThroughPct ?? 0,
      label: "Avg. sell-through",
      decimals: 1,
      suffix: "%",
    },
    { tag: "OUTPUT", value: planCount, label: "Buy plans created" },
  ];

  const categories = topCategories.map((c) => ({
    category: c.category,
    pct: c._avg.sellThroughPct ?? 0,
  }));

  const steps: Step[] = [
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
      <HeroReveal
        headline="A buy plan built on your retail data"
        description="Upload next quarter's catalog and get a buy plan built from your own sales history and current trend signal."
        ctaHref="/buy-plans/new"
        ctaLabel="Upload your catalog"
      />

      <section className="border-b border-hairline bg-white px-6 py-16 sm:px-10">
        <StatsRow stats={stats} />
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-24 sm:px-10">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl text-foreground sm:text-3xl">How MODO works</h2>
          <p className="mt-3 text-foreground-soft">
            Three tools, one quarterly workflow. From what sold last time to what to buy next
            time.
          </p>
        </div>
        <StepsReveal steps={steps} />
      </section>

      <section className="border-t border-hairline bg-white px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-xl text-foreground sm:text-2xl">Top categories by sell-through</h2>
          <div className="mt-8">
            <CategoryBars categories={categories} />
          </div>
          <p className="mt-6 text-xs text-foreground-soft">
            From {orderCount.toLocaleString()} historic orders across {quarterRows.length} quarters.
          </p>
        </div>
      </section>

      <section className="border-t border-hairline bg-ink-band px-6 py-20 sm:px-10">
        <CtaBandReveal
          heading="Ready to plan next quarter?"
          description="Upload your catalog and get a recommended buy plan grounded in your own sales history."
          ctaHref="/buy-plans/new"
          ctaLabel="Upload your catalog"
        />
      </section>
    </div>
  );
}
