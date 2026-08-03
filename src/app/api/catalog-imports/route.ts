import type { Prisma } from "@prisma/client";
import { getCatalogImportView } from "@/lib/catalogImports";
import { uploadCatalogImage } from "@/lib/catalogStorage";
import { parseCatalogFile, type CatalogField } from "@/lib/parseCatalog";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";

const MAX_CATALOG_BYTES = 25 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set(["csv", "xlsx", "xls"]);
const CATALOG_FIELDS = new Set<CatalogField>([
  "sku",
  "styleName",
  "category",
  "color",
  "brand",
  "unitCost",
  "unitPrice",
  "imageUrl",
  "description",
]);

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function parseColumnMapping(value: FormDataEntryValue | null): Record<string, CatalogField> {
  if (typeof value !== "string" || !value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, CatalogField] =>
        typeof entry[1] === "string" && CATALOG_FIELDS.has(entry[1] as CatalogField)
      )
    );
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("catalog");
  const columnMapping = parseColumnMapping(formData.get("mapping"));
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a CSV or Excel catalog first." }, { status: 400 });
  }
  if (!ACCEPTED_EXTENSIONS.has(fileExtension(file.name))) {
    return Response.json({ error: "Unsupported file type. Use CSV, XLSX, or XLS." }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_CATALOG_BYTES) {
    return Response.json({ error: "Catalog files must be between 1 byte and 25 MB." }, { status: 413 });
  }

  const catalogImport = await prisma.catalogImport.create({
    data: {
      fileName: file.name.slice(0, 255),
      status: "validating",
      targetMarket: "IL",
      sourceMetadata: {
        fileSize: file.size,
        mimeType: file.type || null,
        parserVersion: "catalog-v2",
      },
    },
  });
  const job = await prisma.backgroundJob.create({
    data: {
      type: "catalog_parse",
      status: "running",
      progress: 10,
      currentStep: "Reading catalog",
      startedAt: new Date(),
      catalogImportId: catalogImport.id,
    },
  });

  try {
    const parsed = await parseCatalogFile(await file.arrayBuffer(), file.name, {
      columnMapping,
      onImage: ({ buffer, extension, rowNumber }) =>
        uploadCatalogImage({
          catalogImportId: catalogImport.id,
          rowNumber,
          extension,
          buffer,
        }),
    });

    if (parsed.rows.length === 0) {
      const message = parsed.issues[0]?.message ?? "No usable catalog rows were found.";
      await prisma.$transaction([
        prisma.catalogImport.update({
          where: { id: catalogImport.id },
          data: {
            status: "failed",
            rowCount: parsed.stats.rowCount,
            errorCount: Math.max(1, parsed.stats.errorCount),
            mapping: parsed.mapping,
            sourceMetadata: {
              fileSize: file.size,
              mimeType: file.type || null,
              parserVersion: "catalog-v2",
              sheetName: parsed.stats.sheetName,
              headers: parsed.headers,
              issues: parsed.issues.slice(0, 50),
            },
          },
        }),
        prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            progress: 100,
            currentStep: "Validation failed",
            structuredError: { code: "CATALOG_VALIDATION_FAILED", message },
            finishedAt: new Date(),
          },
        }),
      ]);
      return Response.json(
        {
          error: message,
          issues: parsed.issues.slice(0, 20),
          headers: parsed.headers,
          mapping: parsed.mapping,
          mappingRequired: parsed.issues.some((issue) => issue.code === "missing_required_column"),
        },
        { status: 422 }
      );
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.backgroundJob.update({
        where: { id: job.id },
        data: { progress: 65, currentStep: "Saving validated products" },
      });
      await transaction.catalogProduct.createMany({
        data: parsed.rows.map((row) => ({
          catalogImportId: catalogImport.id,
          originalRow: row.originalRow,
          temporaryId: row.temporaryId,
          brand: row.brand,
          category: row.category,
          styleName: row.styleName,
          sku: row.sku,
          color: row.color,
          description: row.description,
          imageRef: row.imageRef,
          sourceUrl: row.sourceUrl,
          wholesalePrice: row.unitCost,
          retailPrice: row.unitPrice,
          margin: row.unitPrice > 0 ? (row.unitPrice - row.unitCost) / row.unitPrice : null,
          rawRow: row.rawRow as Prisma.InputJsonValue,
          validationStatus: row.validationStatus,
          validationIssues: row.validationIssues as unknown as Prisma.InputJsonValue,
          contentHash: row.contentHash,
        })),
      });
      await transaction.catalogImport.update({
        where: { id: catalogImport.id },
        data: {
          status: "ready",
          rowCount: parsed.stats.rowCount,
          validRowCount: parsed.stats.validRowCount,
          warningCount: parsed.stats.warningCount,
          errorCount: parsed.stats.errorCount,
          mapping: parsed.mapping,
          sourceMetadata: {
            fileSize: file.size,
            mimeType: file.type || null,
            parserVersion: "catalog-v2",
            sheetName: parsed.stats.sheetName,
            embeddedImageCount: parsed.stats.embeddedImageCount,
            categoryCount: parsed.stats.categoryCount,
            headers: parsed.headers,
            issues: parsed.issues.slice(0, 50),
          },
        },
      });
      await transaction.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "succeeded",
          progress: 100,
          currentStep: "Catalog ready",
          result: {
            validRowCount: parsed.stats.validRowCount,
            warningCount: parsed.stats.warningCount,
            errorCount: parsed.stats.errorCount,
          },
          finishedAt: new Date(),
        },
      });
    });

    const view = await getCatalogImportView(catalogImport.id);
    return Response.json({ catalogImport: view }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog processing failed.";
    await prisma.$transaction([
      prisma.catalogImport.update({
        where: { id: catalogImport.id },
        data: { status: "failed", errorCount: 1 },
      }),
      prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          progress: 100,
          currentStep: "Import failed",
          structuredError: { code: "CATALOG_IMPORT_FAILED", message },
          finishedAt: new Date(),
        },
      }),
    ]);
    return Response.json({ error: "The catalog could not be processed. Check the file and try again." }, { status: 500 });
  }
}
