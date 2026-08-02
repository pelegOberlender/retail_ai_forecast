import { prisma } from "@/lib/prisma";
import { LinkButton, Card } from "@/components/ui";

export default async function Home() {
  const [orderCount, quarterRows, avgSellThrough, planCount] = await Promise.all([
    prisma.historicOrder.count(),
    prisma.historicOrder.findMany({ distinct: ["season"], select: { season: true } }),
    prisma.historicOrder.aggregate({ _avg: { sellThroughPct: true } }),
    prisma.buyPlan.count(),
  ]);

  const stats = [
    { tag: "HISTORY", value: orderCount.toLocaleString(), label: "Order records" },
    { tag: "COVERAGE", value: String(quarterRows.length), label: "Quarters tracked" },
    { tag: "PERFORMANCE", value: `${(avgSellThrough._avg.sellThroughPct ?? 0).toFixed(1)}%`, label: "Avg. sell-through" },
    { tag: "OUTPUT", value: String(planCount), label: "Buy plans created" },
  ];

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-hairline bg-background">
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.5]"
          preserveAspectRatio="none"
          viewBox="0 0 1200 500"
          aria-hidden
        >
          <polyline
            points="0,420 120,380 240,400 360,300 480,340 600,220 720,260 840,160 960,190 1080,90 1200,120"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />
          <polyline
            points="0,470 150,450 300,460 450,410 600,430 750,360 900,390 1050,320 1200,340"
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="1"
            strokeOpacity="0.12"
          />
        </svg>

        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-7 px-6 py-28 text-center sm:py-40">
          <span className="tracking-label rounded-full border border-hairline-strong px-4 py-1.5 text-[11px] text-foreground-soft">
            Data-driven buy planning
          </span>
          <h1 className="font-display text-4xl leading-[1.05] text-foreground sm:text-6xl">
            A buy plan for every quarter,
            <br />
            built on your <span className="text-accent">retail</span> data
          </h1>
          <p className="max-w-xl text-balance text-lg text-foreground-soft">
            Upload next quarter&apos;s catalog and we&apos;ll build a data-driven buy plan
            based on historic sales, sell-through, and fashion trend signals.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/buy-plans/new" variant="accent" className="px-6 py-3 text-[15px]">
              Upload your catalog
            </LinkButton>
            <LinkButton href="/historic-orders" variant="outline" className="px-6 py-3 text-[15px]">
              View historic orders
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline bg-nav px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.tag}>
              <span className="tracking-label inline-block rounded-full border border-hairline-strong px-3 py-1 text-[10px] text-foreground-soft">
                {s.tag}
              </span>
              <div className="mt-4 font-display text-4xl text-foreground sm:text-5xl">{s.value}</div>
              <div className="mt-1 text-sm text-foreground-soft">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10">
        <h2 className="font-display text-2xl text-foreground sm:text-3xl">How MODO works</h2>
        <p className="mt-3 max-w-2xl text-foreground-soft">
          Three tools, one quarterly workflow &mdash; from what sold last time to what to buy next time.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <FeatureCard
            step="01"
            title="Manage historic orders"
            description="Browse, filter, and export every past order &mdash; quantities, sell-through, and revenue by SKU, category, and quarter."
            href="/historic-orders"
            cta="Open historic orders"
          />
          <FeatureCard
            step="02"
            title="Create a buy plan"
            description="Upload next quarter's catalog. The engine matches each item against comparable history and trend signal to recommend quantities."
            href="/buy-plans/new"
            cta="Start a new buy plan"
          />
          <FeatureCard
            step="03"
            title="Review, lock, export"
            description="Adjust recommended quantities line by line, lock the plan when it's final, and export a ready-to-send Excel file."
            href="/buy-plans"
            cta="View buy plans"
          />
        </div>
      </section>

      <section className="border-t border-hairline bg-accent px-6 py-16 text-center sm:px-10">
        <h2 className="font-display text-3xl text-accent-ink sm:text-4xl">Ready to plan next quarter?</h2>
        <p className="mx-auto mt-3 max-w-lg text-accent-ink/80">
          Upload your catalog and get a recommended buy plan grounded in your own sales history.
        </p>
        <div className="mt-7">
          <LinkButton href="/buy-plans/new" variant="light" className="px-6 py-3 text-[15px]">
            Upload your catalog
          </LinkButton>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  step,
  title,
  description,
  href,
  cta,
}: {
  step: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <span className="font-display text-sm text-accent">{step}</span>
      <h3 className="font-display text-lg text-foreground">{title}</h3>
      <p className="flex-1 text-sm text-foreground-soft">{description}</p>
      <LinkButton href={href} variant="outline" className="self-start text-xs">
        {cta}
      </LinkButton>
    </Card>
  );
}
