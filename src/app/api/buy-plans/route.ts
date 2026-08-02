import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCatalogFile } from "@/lib/parseCatalog";
import { generateBuyPlanRecommendations } from "@/lib/recommend";

export async function GET() {
  const plans = await prisma.buyPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const summarized = plans.map((p) => ({
    id: p.id,
    name: p.name,
    quarter: p.quarter,
    brandFocus: p.brandFocus,
    status: p.status,
    createdAt: p.createdAt,
    lockedAt: p.lockedAt,
    itemCount: p.items.length,
    totalUnits: p.items.reduce((sum, i) => sum + i.finalQty, 0),
    totalCost: p.items.reduce((sum, i) => sum + i.finalQty * i.unitCost, 0),
    projectedRevenue: p.items.reduce((sum, i) => sum + i.finalQty * i.unitPrice, 0),
  }));

  return Response.json({ plans: summarized });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("catalog");
  const name = String(formData.get("name") ?? "").trim();
  const quarter = String(formData.get("quarter") ?? "").trim();
  const brandFocus = String(formData.get("brandFocus") ?? "").trim() || undefined;
  const totalBudgetRaw = formData.get("totalBudget");
  const totalBudget = totalBudgetRaw ? parseFloat(String(totalBudgetRaw)) : undefined;

  if (!(file instanceof File)) {
    return Response.json({ error: "No catalog file uploaded." }, { status: 400 });
  }
  if (!quarter) {
    return Response.json({ error: "Target quarter is required." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const { items, errors } = parseCatalogFile(buffer);

  if (items.length === 0) {
    return Response.json({ error: errors[0] ?? "Could not parse any catalog rows.", errors }, { status: 400 });
  }

  const recommendations = await generateBuyPlanRecommendations(items, { quarter, brandFocus, totalBudget });

  const plan = await prisma.buyPlan.create({
    data: {
      name: name || `${quarter} Buy Plan`,
      quarter,
      brandFocus,
      totalBudget,
      status: "draft",
      items: {
        create: recommendations.map((r) => ({
          sku: r.sku,
          styleName: r.styleName,
          category: r.category,
          color: r.color,
          brand: r.brand,
          unitCost: r.unitCost,
          unitPrice: r.unitPrice,
          recommendedQty: r.recommendedQty,
          finalQty: r.finalQty,
          trendScore: r.trendScore,
          confidence: r.confidence,
          rationale: r.rationale,
          similarHistoricSku: r.similarHistoricSku,
          sellThroughForecastPct: r.sellThroughForecastPct,
          imageUrl: r.imageUrl,
        })),
      },
    },
    include: { items: true },
  });

  return Response.json({ plan, parseWarnings: errors });
}
