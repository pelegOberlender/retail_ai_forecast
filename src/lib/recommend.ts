import { prisma } from "@/lib/prisma";
import type { HistoricOrder } from "@prisma/client";
import { getTrendScore } from "@/lib/ai/trend";
import { embedTexts, cosineSimilarity } from "@/lib/ai/embeddings";

/**
 * Buy plan recommendation engine, built on this retailer's own historic order
 * data plus two optional live signals that activate automatically once their
 * API keys are configured — no code changes needed when the keys arrive:
 *
 * - `getTrendScore` (src/lib/ai/trend.ts): a Claude agent with the web search
 *   tool, researching real trend momentum for a brand/category/quarter.
 *   Returns no signal when ANTHROPIC_API_KEY is unset. Missing live evidence
 *   never becomes an invented trend score.
 * - `embedTexts` (src/lib/ai/embeddings.ts): Voyage AI embeddings for
 *   catalog-to-history similarity. Falls back to token-overlap similarity
 *   when VOYAGE_API_KEY is unset.
 */

export type CatalogItemInput = {
  productId?: string;
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
  productId: string | null;
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
  targetMarket?: string;
  totalBudget?: number;
  onProgress?: (progress: {
    processedCategories: number;
    totalCategories: number;
    currentCategory: string;
  }) => void | Promise<void>;
};

const STOPWORDS = new Set(["the", "a", "an", "with", "and", "of"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Token-overlap similarity — fallback when embeddings aren't configured.
function tokenSimilarity(a: string, b: string): number {
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

function clampQty(qty: number): number {
  return Math.max(12, Math.min(400, Math.round(qty / 5) * 5));
}

/** Builds a per-pair similarity lookup for one category — embeddings when available, token overlap otherwise. */
async function buildSimilarityFn(
  categoryItems: CatalogItemInput[],
  candidates: HistoricOrder[]
): Promise<(itemIdx: number, candidateIdx: number) => number> {
  const catalogTexts = categoryItems.map((i) => `${i.styleName} ${i.color ?? ""}`.trim());
  const historicTexts = candidates.map((c) => `${c.styleName} ${c.color}`.trim());

  const vectors = catalogTexts.length + historicTexts.length > 0 ? await embedTexts([...catalogTexts, ...historicTexts]) : null;

  if (vectors) {
    const catalogVectors = vectors.slice(0, catalogTexts.length);
    const historicVectors = vectors.slice(catalogTexts.length);
    return (itemIdx, candidateIdx) => cosineSimilarity(catalogVectors[itemIdx], historicVectors[candidateIdx]);
  }

  return (itemIdx, candidateIdx) => tokenSimilarity(catalogTexts[itemIdx], historicTexts[candidateIdx]);
}

export async function generateBuyPlanRecommendations(
  items: CatalogItemInput[],
  options: GenerateOptions
): Promise<RecommendationResult[]> {
  const targetQ = quarterNumber(options.quarter);
  const categories = Array.from(new Set(items.map((i) => i.category)));

  const historicByCategory = new Map<string, HistoricOrder[]>();
  const trendByCategory = new Map<string, { score: number; rationale: string } | null>();

  await Promise.all([
    ...categories.map(async (category) => {
      const rows = await prisma.historicOrder.findMany({
        where: { category },
        orderBy: { orderDate: "desc" },
      });
      historicByCategory.set(category, rows);
    }),
    ...categories.map(async (category) => {
      const result = await getTrendScore(
        options.brandFocus,
        category,
        options.quarter,
        options.targetMarket ?? "IL"
      );
      trendByCategory.set(category, result);
    }),
  ]);

  const results: RecommendationResult[] = [];

  for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
    const category = categories[categoryIndex];
    const categoryItems = items.filter((i) => i.category === category);
    const candidates = historicByCategory.get(category) ?? [];
    const liveTrend = trendByCategory.get(category) ?? null;
    const simFn = await buildSimilarityFn(categoryItems, candidates);

    for (let itemIdx = 0; itemIdx < categoryItems.length; itemIdx++) {
      const item = categoryItems[itemIdx];

      // Prefer same-season analogs (same calendar quarter, prior years) which is
      // the strongest real signal we have for a forecast.
      const scored = candidates
        .map((c, candidateIdx) => {
          const sameSeason = quarterNumber(c.season) === targetQ ? 0.25 : 0;
          const sim = simFn(itemIdx, candidateIdx) + (item.color && c.color === item.color ? 0.15 : 0);
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

      const trendScore = liveTrend ? liveTrend.score : 0;
      const momentum = liveTrend ? 0.7 + (trendScore / 100) * 0.6 : 1;
      const recommendedQty = clampQty(avgQtyOrdered * momentum);

      const bestMatch = strongMatches[0]?.order ?? null;

      const historicSentence = bestMatch
        ? `Comparable to ${bestMatch.sku} (${bestMatch.styleName}, ${bestMatch.season}) which sold through ${bestMatch.sellThroughPct.toFixed(1)}%.`
        : `No close historic match. Using the ${category} category average (${(avgSellThrough ?? 55).toFixed(1)}% sell-through).`;
      const trendSentence = liveTrend
        ? liveTrend.rationale
        : "Live trend analysis is unavailable and did not contribute to this recommendation.";
      const rationale = `${historicSentence} ${trendSentence}`;

      results.push({
        productId: item.productId ?? null,
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

    await options.onProgress?.({
      processedCategories: categoryIndex + 1,
      totalCategories: categories.length,
      currentCategory: category,
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
