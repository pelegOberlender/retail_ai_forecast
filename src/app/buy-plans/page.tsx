import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Badge, LinkButton, StatTile, EmptyState } from "@/components/ui";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function BuyPlansPage() {
  const plans = await prisma.buyPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const lockedCount = plans.filter((p) => p.status === "locked").length;
  const totalUnits = plans.reduce((s, p) => s + p.items.reduce((si, i) => si + i.finalQty, 0), 0);
  const totalCost = plans.reduce((s, p) => s + p.items.reduce((si, i) => si + i.finalQty * i.unitCost, 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">Buy Plans</h1>
          <p className="mt-2 max-w-xl text-foreground-soft">
            Every buy plan you&apos;ve generated, by quarter, draft or locked and ready to send.
          </p>
        </div>
        <LinkButton href="/buy-plans/new" variant="dark" className="cursor-pointer px-6 py-3 text-[15px]">
          New buy plan
        </LinkButton>
      </div>

      {plans.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total Plans" value={String(plans.length)} />
          <StatTile label="Locked" value={String(lockedCount)} hint={`${plans.length - lockedCount} draft`} />
          <StatTile label="Total Units" value={totalUnits.toLocaleString()} />
          <StatTile label="Total Cost" value={currency.format(totalCost)} />
        </div>
      )}

      {plans.length === 0 ? (
        <Card>
          <EmptyState
            title="No buy plans yet"
            description="Upload a catalog to generate your first quarterly buy plan."
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3M12 3v12m0 0l-4-4m4 4l4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            action={
              <LinkButton href="/buy-plans/new" variant="dark" className="cursor-pointer px-6 py-2.5 text-sm">
                Create your first buy plan
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const totalUnits = plan.items.reduce((s, i) => s + i.finalQty, 0);
            const totalCost = plan.items.reduce((s, i) => s + i.finalQty * i.unitCost, 0);
            const locked = plan.status === "locked";
            return (
              <Link key={plan.id} href={`/buy-plans/${plan.id}`}>
                <Card className="flex h-full flex-col gap-3 p-5 transition-colors hover:bg-surface-hover">
                  <div className="flex items-center justify-between">
                    <Badge tone="accent">{plan.quarter}</Badge>
                    <Badge tone={locked ? "green" : "neutral"}>{locked ? "Locked" : "Draft"}</Badge>
                  </div>
                  <h3 className="font-display text-base text-foreground">{plan.name}</h3>
                  {plan.brandFocus && <p className="text-xs text-foreground-soft">Trend focus: {plan.brandFocus}</p>}
                  <div className="mt-auto grid grid-cols-2 gap-3 border-t border-hairline pt-3 text-sm">
                    <div>
                      <div className="text-xs text-foreground-soft">SKUs</div>
                      <div className="font-medium text-foreground">{plan.items.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-foreground-soft">Units</div>
                      <div className="font-medium text-foreground">{totalUnits.toLocaleString()}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-foreground-soft">Total Cost</div>
                      <div className="font-medium text-foreground">{currency.format(totalCost)}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
