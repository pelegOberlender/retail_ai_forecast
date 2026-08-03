import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryBars } from "@/components/home/CategoryBars";
import { Badge, LinkButton } from "@/components/ui";
import heroImage from "../../public/modo-fashion-intelligence-hero.png";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function Home() {
  const [orderCount, quarterRows, avgSellThrough, planCount, topCategories, recentPlans] = await Promise.all([
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
    prisma.buyPlan.findMany({
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { items: true },
    }),
  ]);

  const categories = topCategories.map((c) => ({
    category: c.category,
    pct: c._avg.sellThroughPct ?? 0,
  }));
  const activePlan = recentPlans[0] ?? null;
  const activeUnits = activePlan?.items.reduce((sum, item) => sum + item.finalQty, 0) ?? 0;
  const activeCost = activePlan?.items.reduce((sum, item) => sum + item.finalQty * item.unitCost, 0) ?? 0;
  const attentionItems = activePlan?.items.filter((item) => item.confidence === "low").length ?? 0;
  const budgetUsage = activePlan?.totalBudget
    ? Math.min(100, (activeCost / activePlan.totalBudget) * 100)
    : null;

  return (
    <div className="min-h-screen bg-background px-5 py-7 sm:px-8 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-screen-2xl">
        <header className="mb-8">
          <p className="text-xs font-medium text-foreground-soft">Buying workspace</p>
          <div className="mt-2 max-w-3xl">
            <h1 className="font-display text-4xl text-foreground sm:text-5xl xl:text-6xl">
              Your quarter at a glance
            </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-foreground-soft">
            Continue the latest plan, review low-confidence recommendations, or start the next buying cycle.
          </p>
          </div>
        </header>

        <section className="grid min-h-[420px] overflow-hidden border-y border-ink-band bg-ink-band text-white lg:grid-cols-[0.62fr_1.38fr]">
          <div className="flex flex-col justify-between gap-12 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/48">
                {activePlan ? `${activePlan.quarter} active plan` : "Ready for the next quarter"}
              </p>
              <h2 className="font-display mt-5 max-w-xl text-4xl leading-[0.98] sm:text-5xl xl:text-6xl">
                {activePlan ? activePlan.name : "Turn retail history into a confident buy plan."}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/62 sm:text-base">
                {activePlan
                  ? `${activePlan.items.length} SKUs are ready for review. Focus on the decisions that need your judgment.`
                  : "Upload the next catalog and build recommendations from your own sell-through history."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton
                href={activePlan ? `/buy-plans/${activePlan.id}` : "/buy-plans/new"}
                variant="accent"
                className="px-6"
              >
                {activePlan ? "Continue plan" : "Create first plan"}
                <span aria-hidden="true">→</span>
              </LinkButton>
              {activePlan && (
                <LinkButton href="/buy-plans/new" className="border-white/20 bg-white/6 text-white hover:bg-white/12">
                  New plan
                </LinkButton>
              )}
            </div>
          </div>
          <div className="relative min-h-[380px] lg:min-h-full">
            <Image
              src={heroImage}
              alt="Fashion buyers reviewing garments and a seasonal color plan in a showroom"
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1024px) 68vw, 100vw"
              className="object-cover object-[58%_center]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-band/45 via-transparent to-transparent lg:from-ink-band/35" />
          </div>
        </section>

        <section aria-label="Workspace metrics" className="mt-6 grid grid-cols-2 overflow-hidden border-y border-hairline bg-white lg:grid-cols-4">
          <Metric label="Historic orders" value={orderCount.toLocaleString()} />
          <Metric label="Quarters tracked" value={quarterRows.length.toLocaleString()} />
          <Metric label="Average sell-through" value={`${(avgSellThrough._avg.sellThroughPct ?? 0).toFixed(1)}%`} />
          <Metric label="Buy plans created" value={planCount.toLocaleString()} />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-panel border border-hairline bg-white">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">Current plan</h2>
                <p className="mt-1 text-xs text-foreground-soft">The latest buying decision in progress</p>
              </div>
              <Link href="/buy-plans" className="focus-ring text-sm font-medium text-accent-dark hover:text-foreground">
                All plans
              </Link>
            </div>

            {activePlan ? (
              <div className="grid gap-0 md:grid-cols-[1fr_220px]">
                <div className="px-5 py-6 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{activePlan.quarter}</Badge>
                    <Badge tone={activePlan.status === "locked" ? "green" : "neutral"}>
                      {activePlan.status === "locked" ? "Locked" : "Draft"}
                    </Badge>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em] text-foreground">{activePlan.name}</h3>
                  <div className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
                    <PlanMetric label="SKUs" value={activePlan.items.length.toLocaleString()} />
                    <PlanMetric label="Units" value={activeUnits.toLocaleString()} />
                    <PlanMetric label="Cost" value={currency.format(activeCost)} />
                  </div>
                </div>
                <div className="border-t border-hairline bg-surface/45 px-5 py-6 md:border-l md:border-t-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-foreground-soft">Needs attention</p>
                  <p className="mt-3 font-mono text-3xl font-medium tracking-[-0.05em] text-foreground">{attentionItems}</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-soft">Low-confidence recommendations to review.</p>
                  <Link href={`/buy-plans/${activePlan.id}`} className="focus-ring mt-5 inline-flex text-sm font-medium text-accent-dark hover:text-foreground">
                    Review decisions →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="px-6 py-12">
                <p className="font-medium text-foreground">No buy plan yet</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-foreground-soft">
                  Upload a catalog to create your first set of recommendations.
                </p>
                <LinkButton href="/buy-plans/new" variant="dark" className="mt-5">Create a buy plan</LinkButton>
              </div>
            )}

            {activePlan && budgetUsage !== null && (
              <div className="border-t border-hairline px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-foreground-soft">Budget used</span>
                  <span className="font-mono font-medium text-foreground">{budgetUsage.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${budgetUsage}%` }} />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-panel border border-hairline bg-white px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">Category signal</h2>
                <p className="mt-1 text-xs text-foreground-soft">Top sell-through across your history</p>
              </div>
              <Link href="/historic-orders" className="focus-ring text-sm font-medium text-accent-dark hover:text-foreground">
                Explore data
              </Link>
            </div>
            <div className="mt-7">
              {categories.length > 0 ? (
                <CategoryBars categories={categories} />
              ) : (
                <p className="text-sm text-foreground-soft">Category performance will appear when historic orders are available.</p>
              )}
            </div>
            <p className="mt-6 border-t border-hairline pt-4 text-xs text-foreground-soft">
              Based on {orderCount.toLocaleString()} orders across {quarterRows.length} quarters.
            </p>
          </section>
        </div>

        {recentPlans.length > 1 && (
          <section className="mt-5 rounded-panel border border-hairline bg-white">
            <div className="border-b border-hairline px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">Recent plans</h2>
            </div>
            <div className="divide-y divide-hairline">
              {recentPlans.slice(1).map((plan) => {
                const total = plan.items.reduce((sum, item) => sum + item.finalQty * item.unitCost, 0);
                return (
                  <Link
                    key={plan.id}
                    href={`/buy-plans/${plan.id}`}
                    className="focus-ring grid gap-3 px-5 py-4 transition-colors hover:bg-surface/45 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{plan.name}</p>
                      <p className="mt-1 text-xs text-foreground-soft">{plan.quarter} · {plan.items.length} SKUs</p>
                    </div>
                    <span className="font-mono text-sm text-foreground">{currency.format(total)}</span>
                    <Badge tone={plan.status === "locked" ? "green" : "neutral"}>{plan.status}</Badge>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-hairline px-5 py-5 odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0 sm:px-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-foreground-soft">{label}</p>
      <p className="mt-2 font-mono text-2xl font-medium tracking-[-0.05em] text-foreground">{value}</p>
    </div>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-foreground-soft">{label}</p>
      <p className="mt-1.5 font-mono text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
