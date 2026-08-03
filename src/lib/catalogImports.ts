import "server-only";
import type { Prisma } from "@prisma/client";
import { createSignedCatalogImageUrls } from "@/lib/catalogStorage";
import { prisma } from "@/lib/prisma";
import type { CatalogImportView, CatalogIssueView, CatalogPreviewPage } from "@/lib/catalogContracts";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const catalogProductPreviewSelect = {
  id: true,
  originalRow: true,
  sku: true,
  styleName: true,
  category: true,
  color: true,
  brand: true,
  description: true,
  wholesalePrice: true,
  retailPrice: true,
  imageRef: true,
  sourceUrl: true,
  validationStatus: true,
  validationIssues: true,
} satisfies Prisma.CatalogProductSelect;

type PreviewProduct = Prisma.CatalogProductGetPayload<{ select: typeof catalogProductPreviewSelect }>;

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function paginationOptions(options: { page?: number; pageSize?: number }) {
  return {
    page: Math.max(1, Math.floor(options.page ?? 1)),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(options.pageSize ?? DEFAULT_PAGE_SIZE))),
  };
}

async function previewRows(products: PreviewProduct[]) {
  const signedUrls = await createSignedCatalogImageUrls(
    products.flatMap((product) => product.imageRef ? [product.imageRef] : [])
  ).catch(() => new Map<string, string>());
  return products.map((product) => ({
    ...product,
    imageUrl: product.imageRef
      ? signedUrls.get(product.imageRef) ?? `/api/catalog-images?path=${encodeURIComponent(product.imageRef)}`
      : product.sourceUrl,
  }));
}

export async function getCatalogPreviewPage(
  id: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<CatalogPreviewPage | null> {
  const { page, pageSize } = paginationOptions(options);
  const catalogImport = await prisma.catalogImport.findUnique({
    where: { id },
    select: {
      validRowCount: true,
      products: {
        orderBy: { originalRow: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: catalogProductPreviewSelect,
      },
    },
  });
  if (!catalogImport) return null;

  return {
    preview: await previewRows(catalogImport.products),
    pagination: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(catalogImport.validRowCount / pageSize)),
      totalItems: catalogImport.validRowCount,
    },
  };
}

export async function getCatalogImportView(
  id: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<CatalogImportView | null> {
  const { page, pageSize } = paginationOptions(options);
  const catalogImport = await prisma.catalogImport.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { originalRow: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: catalogProductPreviewSelect,
      },
    },
  });
  if (!catalogImport) return null;

  const sourceMetadata = recordValue(catalogImport.sourceMetadata);
  const mapping = recordValue(catalogImport.mapping);
  const issues = Array.isArray(sourceMetadata.issues)
    ? (sourceMetadata.issues.filter((issue) => issue && typeof issue === "object") as CatalogIssueView[])
    : [];

  const groupedCategories = await prisma.catalogProduct.groupBy({
    by: ["category"],
    where: { catalogImportId: id },
    _count: { _all: true },
    orderBy: { _count: { category: "desc" } },
  });

  return {
    id: catalogImport.id,
    fileName: catalogImport.fileName,
    status: catalogImport.status,
    uploadedAt: catalogImport.uploadedAt.toISOString(),
    targetMarket: catalogImport.targetMarket,
    rowCount: catalogImport.rowCount,
    validRowCount: catalogImport.validRowCount,
    warningCount: catalogImport.warningCount,
    errorCount: catalogImport.errorCount,
    mapping: Object.fromEntries(Object.entries(mapping).map(([key, value]) => [key, String(value)])),
    issues,
    sourceMetadata,
    categories: groupedCategories.map((group) => ({
      name: group.category ?? "Uncategorized",
      count: group._count._all,
    })),
    preview: await previewRows(catalogImport.products),
    pagination: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(catalogImport.validRowCount / pageSize)),
      totalItems: catalogImport.validRowCount,
    },
  };
}
