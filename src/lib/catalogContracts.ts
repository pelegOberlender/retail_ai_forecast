export type CatalogIssueView = {
  code: string;
  severity: "warning" | "error";
  message: string;
  row?: number;
};

export type CatalogPreviewRow = {
  id: string;
  originalRow: number;
  sku: string | null;
  styleName: string;
  category: string | null;
  color: string | null;
  brand: string | null;
  description: string | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  imageUrl: string | null;
  validationStatus: "pending" | "valid" | "warning" | "error";
  validationIssues: unknown;
};

export type CatalogPreviewPage = {
  preview: CatalogPreviewRow[];
  pagination: CatalogImportView["pagination"];
};

export type CatalogImportView = {
  id: string;
  fileName: string;
  status: "uploaded" | "validating" | "ready" | "failed";
  uploadedAt: string;
  targetMarket: string;
  rowCount: number;
  validRowCount: number;
  warningCount: number;
  errorCount: number;
  mapping: Record<string, string>;
  issues: CatalogIssueView[];
  sourceMetadata: Record<string, unknown>;
  categories: { name: string; count: number }[];
  preview: CatalogPreviewRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
};
