import { prisma } from "@/lib/prisma";
import type { HistoricOrder } from "@prisma/client";

/**
 * Phase 1 recommendation engine: deterministic and rule-based, built entirely on
 * this retailer's own historic order data. It stands in for the eventual pipeline
 * (Claude agent + web search for live trend signal, Voyage embeddings for
 * catalog-to-history similarity) without changing the shape the UI consumes —
 * `generateBuyPlanRecommendations` is the single seam to swap when that's wired in.
 */

export type CatalogItemInput = {
  sku?: string;
  styleName: string;
  category: string;
  color?: string;
  brand?: string;
  unitCost: number;
  unitPrice: number;
  imageUrl?: string;
};

export type RecommendationResult = {
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
  imageUrl: string | null;
};

export type GenerateOptions = {
  quarter: string; // target quarter, e.g. "2026-Q3"
  brandFocus?: string;
  totalBudget?: number;
};

const STOPWORDS = new Set(["the", "a", "an", "with", "and", "of"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Token-overlap similarity — a stand-in for embedding cosine similarity later.
function similarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  return overlap / Math.max(ta.size, tb.size);
}

function quarterNumber(quarter: string): number {
  const n = parseInt(quarter.split("-Q")[1] ?? "1", 10);
  return Number.isFinite(n) ? n : 1;
}

// Deterministic pseudo-trend signal (hash-based) standing in for a future live
// web-search trend read on `brandFocus` + category for the target quarter.
function brandBuzzScore(brandFocus: string | undefined, category: string, quarter: string): number {
  const key = `${brandFocus ?? "general"}::${category}::${quarter}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return 40 + (hash % 60); // 40-99 range so it always contributes positively
}

function clampQty(qty: number): number {
  return Math.max(12, Math.min(400, Math.round(qty / 5) * 5));
}

export async function generateBuyPlanRecommendations(
  items: CatalogItemInput[],
  options: GenerateOptions
): Promise<RecommendationResult[]> {
  const targetQ = quarterNumber(options.quarter);
  const categories = Array.from(new Set(items.map((i) => i.category)));

  const historicByCategory = new Map<string, HistoricOrder[]>();
  await Promise.all(
    categories.map(async (category) => {
      const rows = await prisma.historicOrder.findMany({
        where: { category },
        orderBy: { orderDate: "desc" },
      });
      historicByCategory.set(category, rows);
    })
  );

  const results: RecommendationResult[] = [];

  for (const item of items) {
    const candidates = historicByCategory.get(item.category) ?? [];

    // Prefer same-season analogs (same calendar quarter, prior years) which is
    // the strongest real signal we have for a forecast.
    const scored = candidates
      .map((c) => {
        const sameSeason = quarterNumber(c.season) === targetQ ? 0.25 : 0;
        const sim = similarity(item.styleName, c.styleName) + (item.color && c.color === item.color ? 0.15 : 0);
        return { order: c, score: sim + sameSeason };
      })
      .sort((a, b) => b.score - a.score);

    const strongMatches = scored.filter((s) => s.score >= 0.2).slice(0, 6);
    const pool = strongMatches.length > 0 ? strongMatches.map((s) => s.order) : candidates;

    const matchCount = strongMatches.length;
    const confidence: RecommendationResult["confidence"] =
      matchCount >= 4 ? "high" : matchCount >= 1 ? "medium" : "low";

    const avgSellThrough =
      pool.length > 0 ? pool.reduce((sum, o) => sum + o.sellThroughPct, 0) / pool.length : null;
    const avgQtyOrdered =
      pool.length > 0 ? pool.reduce((sum, o) => sum + o.qtyOrdered, 0) / pool.length : 80;

    const trendScore = Math.round(
      (avgSellThrough ?? 55) * 0.5 + brandBuzzScore(options.brandFocus, item.category, options.quarter) * 0.5
    );

    const momentum = 0.7 + (trendScore / 100) * 0.6; // 0.7x - 1.3x
    const recommendedQty = clampQty(avgQtyOrdered * momentum);

    const bestMatch = strongMatches[0]?.order ?? null;

    const rationale = bestMatch
      ? `Comparable to ${bestMatch.sku} (${bestMatch.styleName}, ${bestMatch.season}) which sold through ${bestMatch.sellThroughPct.toFixed(1)}%. Trend score ${trendScore}/100 for ${item.category}${options.brandFocus ? ` and "${options.brandFocus}"` : ""} heading into ${options.quarter}.`
      : `No close historic match — using ${item.category} category average (${(avgSellThrough ?? 55).toFixed(1)}% sell-through). Trend score ${trendScore}/100 for ${options.quarter}.`;

    results.push({
      sku: item.sku ?? null,
      styleName: item.styleName,
      category: item.category,
      color: item.color ?? null,
      brand: item.brand ?? null,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
      recommendedQty,
      finalQty: recommendedQty,
      trendScore,
      confidence,
      rationale,
      similarHistoricSku: bestMatch?.sku ?? null,
      sellThroughForecastPct: avgSellThrough,
      imageUrl: item.imageUrl ?? null,
    });
  }

  if (options.totalBudget && options.totalBudget > 0) {
    const projectedSpend = results.reduce((sum, r) => sum + r.recommendedQty * r.unitCost, 0);
    if (projectedSpend > options.totalBudget) {
      const factor = options.totalBudget / projectedSpend;
      for (const r of results) {
        r.recommendedQty = Math.max(6, Math.round((r.recommendedQty * factor) / 5) * 5);
        r.finalQty = r.recommendedQty;
      }
    }
  }

  return results;
}
