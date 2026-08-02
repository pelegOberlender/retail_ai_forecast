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
    { label: "Historic order records", value: orderCount.toLocaleString() },
    { label: "Quarters of history", value: String(quarterRows.length) },
    {
      label: "Avg. sell-through",
      value: `${(avgSellThrough._avg.sellThroughPct ?? 0).toFixed(1)}%`,
    },
    { label: "Buy plans created", value: String(planCount) },
  ];

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-hairline">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(176,141,87,0.16), transparent 45%), radial-gradient(circle at 85% 0%, rgba(176,141,87,0.12), transparent 40%), linear-gradient(180deg, #f7f2e6 0%, #ffffff 65%)",
          }}
        />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.35]"
          preserveAspectRatio="none"
          viewBox="0 0 1200 500"
          aria-hidden
        >
          <polyline
            points="0,420 120,380 240,400 360,300 480,340 600,220 720,260 840,160 960,190 1080,90 1200,120"
            fill="none"
            stroke="#b08d57"
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
          <polyline
            points="0,470 150,450 300,460 450,410 600,430 750,360 900,390 1050,320 1200,340"
            fill="none"
            stroke="#8c6f43"
            strokeWidth="1"
            strokeOpacity="0.35"
          />
        </svg>

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-28 text-center sm:py-36">
          <span className="rounded-full border border-hairline bg-white/70 px-4 py-1.5 text-xs uppercase tracking-widest text-ink-soft">
            Data-driven buy planning
          </span>
          <h1 className="font-serif-display text-5xl leading-tight text-ink sm:text-6xl">
            Welcome to MODO
          </h1>
          <p className="max-w-xl text-balance text-lg text-ink-soft">
            Upload next quarter&apos;s catalog and we&apos;ll build a data-driven buy plan
            based on historic sales, sell-through, and fashion trend signals.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/buy-plans/new" variant="dark" className="px-6 py-3 text-[15px]">
              Upload your catalog
            </LinkButton>
            <LinkButton href="/historic-orders" variant="outline" className="bg-white/70 px-6 py-3 text-[15px]">
              View historic orders
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 sm:px-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5 text-center sm:text-left">
              <div className="font-serif-display text-3xl text-ink">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink-soft">{s.label}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-20 sm:px-10">
        <h2 className="font-serif-display text-2xl text-ink">How MODO works</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Three tools, one quarterly workflow &mdash; from what sold last time to what to buy next time.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
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

      <section className="border-t border-hairline bg-gradient-to-br from-[#8c6f43] via-[#a9895f] to-[#c9a96b] px-6 py-16 text-center text-cream sm:px-10">
        <h2 className="font-serif-display text-3xl">Ready to plan next quarter?</h2>
        <p className="mx-auto mt-2 max-w-lg text-cream/85">
          Upload your catalog and get a recommended buy plan grounded in your own sales history.
        </p>
        <div className="mt-6">
          <LinkButton href="/buy-plans/new" variant="primary" className="px-6 py-3 text-[15px]">
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
      <span className="font-serif-display text-sm text-gold-dark">{step}</span>
      <h3 className="font-serif-display text-xl text-ink">{title}</h3>
      <p className="flex-1 text-sm text-ink-soft">{description}</p>
      <LinkButton href={href} variant="outline" className="self-start text-xs">
        {cta}
      </LinkButton>
    </Card>
  );
}
