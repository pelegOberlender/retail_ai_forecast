import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Badge, LinkButton } from "@/components/ui";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function BuyPlansPage() {
  const plans = await prisma.buyPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-display text-4xl text-ink">Buy Plans</h1>
          <p className="mt-2 max-w-xl text-ink-soft">
            Every buy plan you&apos;ve generated, by quarter &mdash; draft or locked and ready to send.
          </p>
        </div>
        <LinkButton href="/buy-plans/new" variant="dark" className="px-6 py-3 text-[15px]">
          New buy plan
        </LinkButton>
      </div>

      {plans.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-ink-soft">No buy plans yet.</p>
          <LinkButton href="/buy-plans/new" variant="dark" className="mt-4 inline-flex px-6 py-2.5 text-sm">
            Create your first buy plan
          </LinkButton>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const totalUnits = plan.items.reduce((s, i) => s + i.finalQty, 0);
            const totalCost = plan.items.reduce((s, i) => s + i.finalQty * i.unitCost, 0);
            const locked = plan.status === "locked";
            return (
              <Link key={plan.id} href={`/buy-plans/${plan.id}`}>
                <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <Badge tone="gold">{plan.quarter}</Badge>
                    <Badge tone={locked ? "green" : "neutral"}>{locked ? "Locked" : "Draft"}</Badge>
                  </div>
                  <h3 className="font-serif-display text-lg text-ink">{plan.name}</h3>
                  {plan.brandFocus && <p className="text-xs text-ink-soft">Trend focus: {plan.brandFocus}</p>}
                  <div className="mt-auto grid grid-cols-2 gap-3 border-t border-hairline pt-3 text-sm">
                    <div>
                      <div className="text-xs text-ink-soft">SKUs</div>
                      <div className="font-medium text-ink">{plan.items.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-soft">Units</div>
                      <div className="font-medium text-ink">{totalUnits.toLocaleString()}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-ink-soft">Total Cost</div>
                      <div className="font-medium text-ink">{currency.format(totalCost)}</div>
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
