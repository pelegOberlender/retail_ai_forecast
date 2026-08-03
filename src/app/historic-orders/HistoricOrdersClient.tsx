"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Badge, StatTile, EmptyState, Button } from "@/components/ui";

type HistoricOrder = {
  id: string;
  sku: string;
  styleName: string;
  category: string;
  color: string;
  size: string;
  brand: string;
  season: string;
  orderDate: string;
  qtyOrdered: number;
  qtySold: number;
  unitCost: number;
  unitPrice: number;
  revenue: number;
  sellThroughPct: number;
};

type Summary = {
  count: number;
  totalRevenue: number;
  avgSellThrough: number;
  totalUnitsSold: number;
};

type Options = {
  seasons: string[];
  categories: string[];
  brands: string[];
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function HistoricOrdersClient({ options }: { options: Options }) {
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<HistoricOrder[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const loading = orders === null;

  const hasFilters = Boolean(season || category || brand || q);

  function clearFilters() {
    setSeason("");
    setCategory("");
    setBrand("");
    setQ("");
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (season) params.set("season", season);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (q) params.set("q", q);
    return params.toString();
  }, [season, category, brand, q]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/historic-orders${queryString ? `?${queryString}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setOrders(data.orders);
        setSummary(data.summary);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <Select label="Quarter" value={season} onChange={setSeason} options={options.seasons} />
        <Select label="Category" value={category} onChange={setCategory} options={options.categories} />
        <Select label="Brand" value={brand} onChange={setBrand} options={options.brands} />
        <div className="min-w-[200px] flex-1">
          <label className="tracking-label mb-1 block text-xs text-foreground-soft">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Style, SKU, or color…"
            className="w-full rounded-full border border-hairline bg-surface-hover px-4 py-2 text-sm text-foreground outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="cursor-pointer px-2 py-2 text-xs">
            Clear filters
          </Button>
        )}
        <a
          href={`/api/historic-orders?${queryString ? `${queryString}&` : ""}format=xlsx`}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/88 sm:self-end"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3M12 3v12m0 0l-4-4m4 4l4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export to Excel
        </a>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Orders" value={summary.count.toLocaleString()} />
          <StatTile label="Units Sold" value={summary.totalUnitsSold.toLocaleString()} />
          <StatTile label="Revenue" value={currency.format(summary.totalRevenue)} />
          <StatTile label="Avg. Sell-Through" value={`${summary.avgSellThrough.toFixed(1)}%`} />
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="tracking-label sticky top-0 bg-surface-hover text-xs text-foreground-soft">
              <tr>
                <Th>SKU</Th>
                <Th>Style</Th>
                <Th>Category</Th>
                <Th>Color</Th>
                <Th>Brand</Th>
                <Th>Quarter</Th>
                <Th className="text-right">Ordered</Th>
                <Th className="text-right">Sold</Th>
                <Th className="text-right">Sell-Through</Th>
                <Th className="text-right">Revenue</Th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-hairline">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 animate-pulse rounded-full bg-surface-hover" style={{ width: `${40 + ((i * 7 + j * 13) % 45)}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}
              {orders && orders.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      title="No orders match these filters"
                      description="Try a different quarter, category, or search term."
                      action={
                        hasFilters ? (
                          <Button variant="outline" onClick={clearFilters} className="cursor-pointer text-sm">
                            Clear filters
                          </Button>
                        ) : undefined
                      }
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
                    />
                  </td>
                </tr>
              )}
              {orders &&
                orders.map((o) => (
                  <tr key={o.id} className="border-t border-hairline hover:bg-surface-hover/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground-soft">{o.sku}</td>
                    <td className="px-4 py-2.5 text-foreground">{o.styleName}</td>
                    <td className="px-4 py-2.5 text-foreground-soft">{o.category}</td>
                    <td className="px-4 py-2.5 text-foreground-soft">{o.color}</td>
                    <td className="px-4 py-2.5 text-foreground-soft">{o.brand}</td>
                    <td className="px-4 py-2.5">
                      <Badge>{o.season}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{o.qtyOrdered}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{o.qtySold}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <SellThroughBadge value={o.sellThroughPct} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{currency.format(o.revenue)}</td>
                  </tr>
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="tracking-label mb-1 block text-xs text-foreground-soft">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-full border border-hairline bg-surface-hover px-4 py-2 text-sm text-foreground outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/25"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SellThroughBadge({ value }: { value: number }) {
  const tone = value >= 75 ? "green" : value >= 50 ? "accent" : "red";
  return <Badge tone={tone}>{value.toFixed(1)}%</Badge>;
}
