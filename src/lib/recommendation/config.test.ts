import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSelectionScore,
  classifySelection,
  roundQuantity,
} from "./config";

test("selection score uses the configured weighted model", () => {
  const score = calculateSelectionScore({
    historicalFit: 80,
    trendRelevance: 60,
    brandCustomerFit: 90,
    commercialValue: 70,
    assortmentContribution: 50,
  });
  assert.equal(score, 72);
});

test("missing evidence is omitted and remaining weights are normalized", () => {
  const score = calculateSelectionScore({ historicalFit: 80, trendRelevance: null });
  assert.equal(score, 80);
});

test("selection classes have stable boundaries", () => {
  assert.equal(classifySelection(80), "must-buy");
  assert.equal(classifySelection(65), "strong");
  assert.equal(classifySelection(45), "consider");
  assert.equal(classifySelection(null), "exclude");
});

test("quantity respects pack size and bounds", () => {
  assert.equal(roundQuantity(73), 75);
  assert.equal(roundQuantity(1), 10);
  assert.equal(roundQuantity(999), 400);
});
