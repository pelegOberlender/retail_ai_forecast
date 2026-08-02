"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button } from "@/components/ui";

type BuyPlanItem = {
  id: string;
  sku: string | null;
  styleName: string;
  category: string;
  color: string | null;
  brand: string | null;
  unitCost: number;
  unitPrice: number;
  recommendedQty: number;
  finalQty: number;
  trendScore: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  similarHistoricSku: string | null;
  sellThroughForecastPct: number | null;
};

type BuyPlan = {
  id: string;
  name: string;
  quarter: string;
  brandFocus: string | null;
  status: "draft" | "locked";
  totalBudget: number | null;
  createdAt: string;
  lockedAt: string | null;
  items: BuyPlanItem[];
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currency2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function BuyPlanEditor({ initialPlan }: { initialPlan: BuyPlan }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [items, setItems] = useState(initialPlan.items);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const locked = plan.status === "locked";

  const totals = useMemo(() => {
    const totalUnits = items.reduce((s, i) => s + i.finalQty, 0);
    const totalCost = items.reduce((s, i) => s + i.finalQty * i.unitCost, 0);
    const projectedRevenue = items.reduce((s, i) => s + i.finalQty * i.unitPrice, 0);
    const margin = projectedRevenue > 0 ? ((projectedRevenue - totalCost) / projectedRevenue) * 100 : 0;
    return { totalUnits, totalCost, projectedRevenue, margin };
  }, [items]);

  function updateQty(id: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, finalQty: Math.max(0, qty) } : i)));
    setDirty(true);
  }

  function resetToRecommended(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, finalQty: i.recommendedQty } : i)));
    setDirty(true);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const res = await fetch(`/api/buy-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ id: i.id, finalQty: i.finalQty })) }),
      });
      if (res.ok) setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock() {
    setLocking(true);
    try {
      if (dirty && !locked) await saveChanges();
      const res = await fetch(`/api/buy-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: locked ? "draft" : "locked" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        router.refresh();
      }
    } finally {
      setLocking(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="gold">{plan.quarter}</Badge>
            <Badge tone={locked ? "green" : "neutral"}>{locked ? "Locked" : "Draft"}</Badge>
            {plan.brandFocus && <Badge>Trend focus: {plan.brandFocus}</Badge>}
          </div>
          <h1 className="font-serif-display text-3xl text-ink sm:text-4xl">{plan.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/buy-plans/${plan.id}/export`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:bg-ink/90"
          >
            Export to Excel
          </a>
          {!locked && dirty && (
            <Button variant="outline" onClick={saveChanges} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}
          <Button variant={locked ? "outline" : "dark"} onClick={toggleLock} disabled={locking}>
            {locking ? "Working…" : locked ? "Unlock plan" : "Lock plan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="SKUs" value={String(items.length)} />
        <StatTile label="Total Units" value={totals.totalUnits.toLocaleString()} />
        <StatTile label="Total Cost" value={currency.format(totals.totalCost)} />
        <StatTile label="Projected Margin" value={`${totals.margin.toFixed(1)}%`} />
      </div>

      {locked && (
        <Card className="border-gold-soft bg-gold-soft/15 p-4 text-sm text-gold-dark">
          This plan is locked. Unlock it to adjust quantities before export.
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="max-h-[720px] overflow-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 bg-cream-card text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <Th>Item</Th>
                <Th>Category</Th>
                <Th className="text-right">Cost / Price</Th>
                <Th className="text-right">Trend</Th>
                <Th>Confidence</Th>
                <Th className="text-right">Recommended</Th>
                <Th className="text-right">Final Qty</Th>
                <Th className="text-right">Line Cost</Th>
                <Th>{" "}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr className="border-t border-hairline align-top hover:bg-cream-card/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{item.styleName}</div>
                      <div className="text-xs text-ink-soft">
                        {item.sku ?? "—"} {item.color ? `· ${item.color}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{item.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {currency2.format(item.unitCost)} / {currency2.format(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.trendScore}</td>
                    <td className="px-4 py-3">
                      <Badge tone={item.confidence === "high" ? "green" : item.confidence === "medium" ? "gold" : "neutral"}>
                        {item.confidence}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{item.recommendedQty}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        value={item.finalQty}
                        disabled={locked}
                        onChange={(e) => updateQty(item.id, parseInt(e.target.value || "0", 10))}
                        className="w-20 rounded-lg border border-hairline bg-white px-2 py-1 text-right text-sm outline-none focus:border-gold disabled:bg-cream-card disabled:text-ink-soft"
                      />
                      {!locked && item.finalQty !== item.recommendedQty && (
                        <button
                          onClick={() => resetToRecommended(item.id)}
                          className="mt-1 block w-full text-right text-[11px] text-ink-soft underline hover:text-ink"
                        >
                          reset
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{currency.format(item.finalQty * item.unitCost)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-xs text-ink-soft underline hover:text-ink"
                      >
                        {expandedId === item.id ? "hide" : "why?"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === item.id && (
                    <tr className="border-t border-hairline bg-cream-card/40">
                      <td colSpan={9} className="px-4 py-3 text-xs text-ink-soft">
                        {item.rationale}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-2 font-serif-display text-2xl text-ink">{value}</div>
    </Card>
  );
}
