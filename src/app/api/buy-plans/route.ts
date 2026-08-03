import { z } from "zod";
import { generateBuyPlanRecommendations } from "@/lib/recommend";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";

const CreateBuyPlanSchema = z.object({
  catalogImportId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  brandFocus: z.string().trim().max(120).optional(),
  totalBudget: z.number().positive().max(1_000_000_000).optional(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const plans = await prisma.buyPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const summarized = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    quarter: plan.quarter,
    brandFocus: plan.brandFocus,
    status: plan.status,
    createdAt: plan.createdAt,
    lockedAt: plan.lockedAt,
    itemCount: plan.items.length,
    totalUnits: plan.items.reduce((sum, item) => sum + item.finalQty, 0),
    totalCost: plan.items.reduce((sum, item) => sum + item.finalQty * item.unitCost, 0),
    projectedRevenue: plan.items.reduce((sum, item) => sum + item.finalQty * item.unitPrice, 0),
  }));

  return Response.json({ plans: summarized });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsedPayload = CreateBuyPlanSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return Response.json(
      { error: "Review the plan details and try again.", fields: parsedPayload.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsedPayload.data;

  const catalogImport = await prisma.catalogImport.findUnique({
    where: { id: input.catalogImportId },
    include: { products: { orderBy: { originalRow: "asc" } } },
  });
  if (!catalogImport) return Response.json({ error: "Catalog import not found." }, { status: 404 });
  if (catalogImport.status !== "ready") {
    return Response.json({ error: "The catalog must finish validation before generating a plan." }, { status: 409 });
  }
  if (catalogImport.products.length === 0) {
    return Response.json({ error: "The catalog has no usable products." }, { status: 422 });
  }

  const job = await prisma.backgroundJob.create({
    data: {
      type: "recommendation_generation",
      status: "running",
      progress: 10,
      currentStep: "Preparing recommendation evidence",
      startedAt: new Date(),
      catalogImportId: catalogImport.id,
      payload: { quarter: input.quarter, productCount: catalogImport.products.length },
    },
  });

  try {
    let lastSavedProgress = 10;
    const recommendations = await generateBuyPlanRecommendations(
      catalogImport.products.map((product) => ({
        productId: product.id,
        sku: product.sku ?? undefined,
        styleName: product.styleName,
        category: product.category ?? "Uncategorized",
        color: product.color ?? undefined,
        brand: product.brand ?? undefined,
        unitCost: product.wholesalePrice ?? 0,
        unitPrice: product.retailPrice ?? 0,
        imageUrl: product.imageRef
          ? `/api/catalog-images?path=${encodeURIComponent(product.imageRef)}`
          : product.sourceUrl ?? undefined,
      })),
      {
        quarter: input.quarter,
        brandFocus: input.brandFocus || undefined,
        targetMarket: catalogImport.targetMarket,
        totalBudget: input.totalBudget,
        onProgress: async ({ processedCategories, totalCategories, currentCategory }) => {
          const progress = 20 + Math.round((processedCategories / Math.max(totalCategories, 1)) * 65);
          if (progress - lastSavedProgress < 10 && processedCategories !== totalCategories) return;
          lastSavedProgress = progress;
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: { progress, currentStep: `Analyzing ${currentCategory}` },
          });
        },
      }
    );

    const plan = await prisma.$transaction(async (transaction) => {
      const createdPlan = await transaction.buyPlan.create({
        data: {
          name: input.name,
          quarter: input.quarter,
          brandFocus: input.brandFocus || undefined,
          totalBudget: input.totalBudget,
          targetMarket: catalogImport.targetMarket,
          status: "draft",
          catalogImportId: catalogImport.id,
          items: {
            create: recommendations.map((recommendation) => ({
              productId: recommendation.productId,
              sku: recommendation.sku,
              styleName: recommendation.styleName,
              category: recommendation.category,
              color: recommendation.color,
              brand: recommendation.brand,
              unitCost: recommendation.unitCost,
              unitPrice: recommendation.unitPrice,
              recommendedQty: recommendation.recommendedQty,
              finalQty: recommendation.finalQty,
              trendScore: recommendation.trendScore,
              confidence: recommendation.confidence,
              rationale: recommendation.rationale,
              similarHistoricSku: recommendation.similarHistoricSku,
              sellThroughForecastPct: recommendation.sellThroughForecastPct,
              imageUrl: recommendation.imageUrl,
            })),
          },
        },
        select: { id: true, name: true, quarter: true },
      });
      await transaction.backgroundJob.update({
        where: { id: job.id },
        data: {
          buyPlanId: createdPlan.id,
          status: "succeeded",
          progress: 100,
          currentStep: "Plan ready",
          result: { planId: createdPlan.id, itemCount: recommendations.length },
          finishedAt: new Date(),
        },
      });
      return createdPlan;
    });

    return Response.json({ plan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recommendation generation failed.";
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        progress: 100,
        currentStep: "Generation failed",
        structuredError: { code: "RECOMMENDATION_GENERATION_FAILED", message },
        finishedAt: new Date(),
      },
    });
    return Response.json({ error: "The plan could not be generated. Your validated catalog is still saved." }, { status: 500 });
  }
}
