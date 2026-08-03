import { z } from "zod";

export const SELECTION_COMPONENTS = [
  "historicalFit",
  "trendRelevance",
  "brandCustomerFit",
  "commercialValue",
  "assortmentContribution",
] as const;

export type SelectionComponent = (typeof SELECTION_COMPONENTS)[number];
export type SelectionWeights = Record<SelectionComponent, number>;

export const DEFAULT_TARGET_MARKET = "IL";
export const RECOMMENDATION_ALGORITHM_VERSION = "selection-v1";

export const DEFAULT_SELECTION_WEIGHTS: SelectionWeights = {
  historicalFit: 35,
  trendRelevance: 25,
  brandCustomerFit: 15,
  commercialValue: 15,
  assortmentContribution: 10,
};

export const quantityRulesSchema = z.object({
  minimum: z.number().int().nonnegative().default(6),
  maximum: z.number().int().positive().default(400),
  packSize: z.number().int().positive().default(5),
});

export const DEFAULT_QUANTITY_RULES = quantityRulesSchema.parse({});

export type SelectionScores = Partial<Record<SelectionComponent, number | null>>;

export function calculateSelectionScore(
  scores: SelectionScores,
  weights: SelectionWeights = DEFAULT_SELECTION_WEIGHTS
): number | null {
  const available = SELECTION_COMPONENTS.filter(
    (component) => typeof scores[component] === "number" && Number.isFinite(scores[component])
  );

  if (available.length === 0) return null;

  const availableWeight = available.reduce((sum, component) => sum + weights[component], 0);
  if (availableWeight <= 0) return null;

  const score = available.reduce((sum, component) => {
    const value = Math.max(0, Math.min(100, scores[component] as number));
    return sum + value * (weights[component] / availableWeight);
  }, 0);

  return Math.round(score * 10) / 10;
}

export type SelectionClass = "must-buy" | "strong" | "consider" | "exclude";

export function classifySelection(score: number | null): SelectionClass {
  if (score === null || score < 45) return "exclude";
  if (score >= 80) return "must-buy";
  if (score >= 65) return "strong";
  return "consider";
}

export function roundQuantity(
  quantity: number,
  rules = DEFAULT_QUANTITY_RULES
): number {
  const parsed = quantityRulesSchema.parse(rules);
  const minimumPack = Math.ceil(parsed.minimum / parsed.packSize) * parsed.packSize;
  const maximumPack = Math.floor(parsed.maximum / parsed.packSize) * parsed.packSize;
  const rounded = Math.round(quantity / parsed.packSize) * parsed.packSize;
  return Math.max(minimumPack, Math.min(maximumPack, rounded));
}
