import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildXlsxResponse } from "@/lib/xlsx";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await prisma.buyPlan.findUnique({
    where: { id },
    include: { items: { orderBy: [{ category: "asc" }, { styleName: "asc" }] } },
  });
  if (!plan) return Response.json({ error: "Buy plan not found." }, { status: 404 });

  const rows = plan.items.map((i) => ({
    SKU: i.sku ?? "",
    Style: i.styleName,
    Category: i.category,
    Color: i.color ?? "",
    Brand: i.brand ?? "",
    "Unit Cost": i.unitCost,
    "Unit Price": i.unitPrice,
    "Recommended Qty": i.recommendedQty,
    "Final Qty": i.finalQty,
    "Total Cost": Math.round(i.finalQty * i.unitCost * 100) / 100,
    "Projected Revenue": Math.round(i.finalQty * i.unitPrice * 100) / 100,
    "Trend Score": i.trendScore,
    Confidence: i.confidence,
    "Sell-Through Forecast %": i.sellThroughForecastPct ?? "",
    "Comparable Historic SKU": i.similarHistoricSku ?? "",
    Rationale: i.rationale,
  }));

  const summaryRows = [
    { Field: "Plan Name", Value: plan.name },
    { Field: "Quarter", Value: plan.quarter },
    { Field: "Brand Focus", Value: plan.brandFocus ?? "" },
    { Field: "Status", Value: plan.status },
    { Field: "Total Budget", Value: plan.totalBudget ?? "" },
    { Field: "Total Units", Value: plan.items.reduce((s, i) => s + i.finalQty, 0) },
    {
      Field: "Total Cost",
      Value: Math.round(plan.items.reduce((s, i) => s + i.finalQty * i.unitCost, 0) * 100) / 100,
    },
    {
      Field: "Projected Revenue",
      Value: Math.round(plan.items.reduce((s, i) => s + i.finalQty * i.unitPrice, 0) * 100) / 100,
    },
  ];

  const filename = `${plan.quarter}-buy-plan-${plan.status}.xlsx`;
  return buildXlsxResponse(
    [
      { name: "Buy Plan", rows },
      { name: "Summary", rows: summaryRows },
    ],
    filename
  );
}
