-- PostgreSQL foundation baseline for MODO.
-- Existing SQLite data remains untouched in prisma/dev.db and can be imported
-- into PostgreSQL through a dedicated reconciliation script once credentials
-- for the target Supabase project are configured.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "CatalogImportStatus" AS ENUM ('uploaded', 'validating', 'ready', 'failed');
CREATE TYPE "CatalogValidationStatus" AS ENUM ('pending', 'valid', 'warning', 'error');
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'processing', 'complete', 'failed');
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
CREATE TYPE "JobType" AS ENUM ('catalog_parse', 'product_analysis', 'embedding', 'trend_research', 'recommendation_generation');

CREATE TABLE "HistoricOrder" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "styleName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "qtyOrdered" INTEGER NOT NULL,
    "qtySold" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "sellThroughPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "brand" TEXT,
    "year" INTEGER,
    "season" TEXT,
    "targetMarket" TEXT NOT NULL DEFAULT 'IL',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CatalogImportStatus" NOT NULL DEFAULT 'uploaded',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "validRowCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "sourceMetadata" JSONB,
    "mapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatalogImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "catalogImportId" TEXT NOT NULL,
    "originalRow" INTEGER NOT NULL,
    "temporaryId" TEXT NOT NULL,
    "brand" TEXT,
    "year" INTEGER,
    "season" TEXT,
    "gender" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "styleName" TEXT NOT NULL,
    "styleCode" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "color" TEXT,
    "description" TEXT,
    "imageRef" TEXT,
    "sourceUrl" TEXT,
    "wholesalePrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION,
    "rawRow" JSONB NOT NULL,
    "validationStatus" "CatalogValidationStatus" NOT NULL DEFAULT 'pending',
    "validationIssues" JSONB,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAnalysis" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "visualDescription" TEXT,
    "detectedCategory" TEXT,
    "garmentType" TEXT,
    "silhouette" TEXT,
    "fit" TEXT,
    "sleeveLength" TEXT,
    "neckline" TEXT,
    "length" TEXT,
    "materialCues" JSONB,
    "dominantColors" JSONB,
    "printType" TEXT,
    "logoIntensity" TEXT,
    "aestheticTags" JSONB,
    "occasionTags" JSONB,
    "seasonality" JSONB,
    "coreVsFashion" TEXT,
    "commerciality" DOUBLE PRECISION,
    "novelty" DOUBLE PRECISION,
    "commercialRisk" DOUBLE PRECISION,
    "confidenceByField" JSONB,
    "imageEmbedding" JSONB,
    "textEmbedding" JSONB,
    "modelVersion" TEXT,
    "promptVersion" TEXT,
    "analysisConfidence" DOUBLE PRECISION,
    "contentHash" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrendReport" (
    "id" TEXT NOT NULL,
    "targetMarket" TEXT NOT NULL DEFAULT 'IL',
    "targetQuarter" TEXT NOT NULL,
    "season" TEXT,
    "gender" TEXT,
    "brandFocus" TEXT,
    "category" TEXT,
    "brandPositioning" TEXT,
    "targetCustomer" TEXT,
    "pricePositioning" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "themes" JSONB,
    "sources" JSONB,
    "modelVersion" TEXT,
    "promptVersion" TEXT,
    "confidence" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrendReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecommendationConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "targetMarket" TEXT NOT NULL DEFAULT 'IL',
    "selectionWeights" JSONB NOT NULL,
    "quantityRules" JSONB NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecommendationConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuyPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "brandFocus" TEXT,
    "targetMarket" TEXT NOT NULL DEFAULT 'IL',
    "season" TEXT,
    "gender" TEXT,
    "targetCustomer" TEXT,
    "pricePositioning" TEXT,
    "deliveryWindowStart" TIMESTAMP(3),
    "deliveryWindowEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalBudget" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "catalogImportId" TEXT,
    "recommendationConfigId" TEXT,
    CONSTRAINT "BuyPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuyPlanItem" (
    "id" TEXT NOT NULL,
    "buyPlanId" TEXT NOT NULL,
    "productId" TEXT,
    "sku" TEXT,
    "styleName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT,
    "brand" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "recommendedQty" INTEGER NOT NULL,
    "finalQty" INTEGER NOT NULL,
    "trendScore" DOUBLE PRECISION NOT NULL,
    "selectionScore" DOUBLE PRECISION,
    "selectionClass" TEXT,
    "historicalFitScore" DOUBLE PRECISION,
    "trendRelevanceScore" DOUBLE PRECISION,
    "brandCustomerFitScore" DOUBLE PRECISION,
    "commercialValueScore" DOUBLE PRECISION,
    "assortmentContributionScore" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "similarHistoricSku" TEXT,
    "sellThroughForecastPct" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "userQuantity" INTEGER,
    "recommendationReason" JSONB,
    "evidence" JSONB,
    "overrideReason" TEXT,
    "algorithmVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuyPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "payload" JSONB,
    "result" JSONB,
    "structuredError" JSONB,
    "catalogImportId" TEXT,
    "buyPlanId" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HistoricOrder_category_idx" ON "HistoricOrder"("category");
CREATE INDEX "HistoricOrder_season_idx" ON "HistoricOrder"("season");
CREATE INDEX "HistoricOrder_brand_idx" ON "HistoricOrder"("brand");
CREATE INDEX "CatalogImport_status_idx" ON "CatalogImport"("status");
CREATE INDEX "CatalogImport_targetMarket_season_year_idx" ON "CatalogImport"("targetMarket", "season", "year");
CREATE INDEX "CatalogProduct_brand_season_idx" ON "CatalogProduct"("brand", "season");
CREATE INDEX "CatalogProduct_category_subcategory_idx" ON "CatalogProduct"("category", "subcategory");
CREATE INDEX "CatalogProduct_sku_idx" ON "CatalogProduct"("sku");
CREATE INDEX "CatalogProduct_styleCode_idx" ON "CatalogProduct"("styleCode");
CREATE INDEX "CatalogProduct_validationStatus_idx" ON "CatalogProduct"("validationStatus");
CREATE UNIQUE INDEX "CatalogProduct_catalogImportId_originalRow_key" ON "CatalogProduct"("catalogImportId", "originalRow");
CREATE UNIQUE INDEX "CatalogProduct_catalogImportId_temporaryId_key" ON "CatalogProduct"("catalogImportId", "temporaryId");
CREATE UNIQUE INDEX "ProductAnalysis_productId_key" ON "ProductAnalysis"("productId");
CREATE INDEX "ProductAnalysis_status_idx" ON "ProductAnalysis"("status");
CREATE INDEX "ProductAnalysis_contentHash_modelVersion_idx" ON "ProductAnalysis"("contentHash", "modelVersion");
CREATE INDEX "TrendReport_targetMarket_targetQuarter_category_idx" ON "TrendReport"("targetMarket", "targetQuarter", "category");
CREATE INDEX "TrendReport_expiresAt_idx" ON "TrendReport"("expiresAt");
CREATE INDEX "TrendReport_status_idx" ON "TrendReport"("status");
CREATE INDEX "RecommendationConfig_isDefault_targetMarket_idx" ON "RecommendationConfig"("isDefault", "targetMarket");
CREATE INDEX "BuyPlan_catalogImportId_idx" ON "BuyPlan"("catalogImportId");
CREATE INDEX "BuyPlan_recommendationConfigId_idx" ON "BuyPlan"("recommendationConfigId");
CREATE INDEX "BuyPlan_targetMarket_quarter_idx" ON "BuyPlan"("targetMarket", "quarter");
CREATE INDEX "BuyPlanItem_buyPlanId_idx" ON "BuyPlanItem"("buyPlanId");
CREATE INDEX "BuyPlanItem_productId_idx" ON "BuyPlanItem"("productId");
CREATE INDEX "BuyPlanItem_selectionClass_idx" ON "BuyPlanItem"("selectionClass");
CREATE INDEX "BuyPlanItem_confidence_idx" ON "BuyPlanItem"("confidence");
CREATE INDEX "BackgroundJob_status_queuedAt_idx" ON "BackgroundJob"("status", "queuedAt");
CREATE INDEX "BackgroundJob_type_status_idx" ON "BackgroundJob"("type", "status");
CREATE INDEX "BackgroundJob_catalogImportId_idx" ON "BackgroundJob"("catalogImportId");
CREATE INDEX "BackgroundJob_buyPlanId_idx" ON "BackgroundJob"("buyPlanId");

ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_catalogImportId_fkey" FOREIGN KEY ("catalogImportId") REFERENCES "CatalogImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAnalysis" ADD CONSTRAINT "ProductAnalysis_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyPlan" ADD CONSTRAINT "BuyPlan_catalogImportId_fkey" FOREIGN KEY ("catalogImportId") REFERENCES "CatalogImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuyPlan" ADD CONSTRAINT "BuyPlan_recommendationConfigId_fkey" FOREIGN KEY ("recommendationConfigId") REFERENCES "RecommendationConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuyPlanItem" ADD CONSTRAINT "BuyPlanItem_buyPlanId_fkey" FOREIGN KEY ("buyPlanId") REFERENCES "BuyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyPlanItem" ADD CONSTRAINT "BuyPlanItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_catalogImportId_fkey" FOREIGN KEY ("catalogImportId") REFERENCES "CatalogImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_buyPlanId_fkey" FOREIGN KEY ("buyPlanId") REFERENCES "BuyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
