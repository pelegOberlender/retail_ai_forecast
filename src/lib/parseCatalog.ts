import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import type { CatalogItemInput } from "@/lib/recommend";

export type CatalogField =
  | "sku"
  | "styleName"
  | "category"
  | "color"
  | "brand"
  | "unitCost"
  | "unitPrice"
  | "imageUrl"
  | "description";

export type CatalogValidationIssue = {
  code: string;
  severity: "warning" | "error";
  message: string;
  row?: number;
};

export type ParsedCatalogRow = CatalogItemInput & {
  originalRow: number;
  temporaryId: string;
  description?: string;
  imageRef?: string;
  sourceUrl?: string;
  rawRow: Record<string, string | number | null>;
  validationStatus: "valid" | "warning";
  validationIssues: CatalogValidationIssue[];
  contentHash: string;
};

export type ParsedCatalog = {
  items: CatalogItemInput[];
  rows: ParsedCatalogRow[];
  issues: CatalogValidationIssue[];
  errors: string[];
  mapping: Record<string, CatalogField>;
  headers: string[];
  stats: {
    sheetName: string | null;
    rowCount: number;
    validRowCount: number;
    warningCount: number;
    errorCount: number;
    embeddedImageCount: number;
    categoryCount: number;
  };
};

export type CatalogImageHandler = (input: {
  buffer: Buffer;
  extension: string;
  rowNumber: number;
}) => Promise<string>;

type ParseOptions = {
  onImage?: CatalogImageHandler;
  columnMapping?: Record<string, CatalogField>;
};

type RawValue = string | number | null;
type DraftRow = {
  originalRow: number;
  values: Partial<Record<CatalogField, string | number>>;
  rawRow: Record<string, RawValue>;
  imageRef?: string;
};

const HEADER_ALIASES: Record<string, CatalogField> = {
  sku: "sku",
  "style code": "sku",
  barcode: "sku",
  style: "styleName",
  stylename: "styleName",
  "style name": "styleName",
  product: "styleName",
  name: "styleName",
  category: "category",
  type: "category",
  color: "color",
  colour: "color",
  brand: "brand",
  cost: "unitCost",
  unitcost: "unitCost",
  "unit cost": "unitCost",
  wholesale: "unitCost",
  "wholesale cost": "unitCost",
  price: "unitPrice",
  retail: "unitPrice",
  unitprice: "unitPrice",
  "unit price": "unitPrice",
  "retail price": "unitPrice",
  image: "imageUrl",
  imageurl: "imageUrl",
  "image url": "imageUrl",
  description: "description",
  "ברקוד פריט": "sku",
  "שם פריט": "styleName",
  "תיאור פריט": "description",
  צבע: "color",
  מותג: "brand",
  "תמונת פריט": "imageUrl",
  "מקור פריט": "description",
};

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/\bdress(es)?\b/i, "Dresses"],
  [/\bt-?shirt\b|\btee\b|\bpolo\b|\bblouse\b|\btop\b|\btank\b/i, "Tops"],
  [/\bjean\b|\bdenim\b/i, "Denim"],
  [/\b(over)?coat\b|\bjacket\b|\bparka\b|\btrench\b/i, "Outerwear"],
  [/\bsweater\b|\bknit\b|\bcardigan\b|\bpullover\b|\bturtleneck\b/i, "Knitwear"],
  [/\btrouser\b|\bpant\b|\bskirt\b|\bcargo\b|\bslim\s?3301\b/i, "Bottoms"],
  [/\bboot\b|\bsneaker\b|\bloafer\b|\bsandal\b|\bheel\b/i, "Footwear"],
  [/\bbag\b|\btote\b|\bbelt\b|\bscarf\b|\bearring\b|\bjewel/i, "Accessories"],
];

function emptyCatalog(
  issue: CatalogValidationIssue,
  sheetName: string | null = null,
  mapping: Record<string, CatalogField> = {},
  headers: string[] = []
): ParsedCatalog {
  return {
    items: [],
    rows: [],
    issues: [issue],
    errors: [issue.message],
    mapping,
    headers,
    stats: {
      sheetName,
      rowCount: 0,
      validRowCount: 0,
      warningCount: 0,
      errorCount: 1,
      embeddedImageCount: 0,
      categoryCount: 0,
    },
  };
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function inferCategory(text: string): string {
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return "Uncategorized";
}

function toCellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
  }
  return String(value).trim();
}

function toRawValue(value: unknown): RawValue {
  if (typeof value === "number") return value;
  const text = toCellText(value);
  return text || null;
}

function parseNumericCell(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const input = toCellText(value).replace(/\s/g, "");
  if (!input) return undefined;

  const lastComma = input.lastIndexOf(",");
  const lastDot = input.lastIndexOf(".");
  const decimalComma = lastComma > lastDot && input.length - lastComma <= 3;
  const normalized = decimalComma
    ? input.replace(/\./g, "").replace(",", ".")
    : input.replace(/,/g, "");
  const parsed = Number.parseFloat(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function contentHash(row: DraftRow, styleName: string): string {
  return createHash("sha256")
    .update(JSON.stringify([styleName, row.values.sku, row.values.color, row.values.brand]))
    .digest("hex");
}

function finalizeRows(
  drafts: DraftRow[],
  mapping: Record<string, CatalogField>,
  headers: string[],
  sheetName: string | null,
  parseIssues: CatalogValidationIssue[],
  sourceRowCount: number,
  embeddedImageCount: number
): ParsedCatalog {
  const rows: ParsedCatalogRow[] = [];
  const issues = [...parseIssues];
  const seen = new Map<string, number>();

  for (const draft of drafts) {
    const styleName = String(draft.values.styleName ?? "").trim();
    if (!styleName) {
      issues.push({
        code: "missing_style_name",
        severity: "error",
        row: draft.originalRow,
        message: `Row ${draft.originalRow}: item name is missing, so the row was skipped.`,
      });
      continue;
    }

    const description = String(draft.values.description ?? "").trim() || undefined;
    const suppliedCategory = String(draft.values.category ?? "").trim();
    const category = suppliedCategory || inferCategory(`${styleName} ${description ?? ""}`);
    const rowIssues: CatalogValidationIssue[] = [];

    if (!suppliedCategory) {
      rowIssues.push({
        code: "category_inferred",
        severity: "warning",
        row: draft.originalRow,
        message: `Row ${draft.originalRow}: category was inferred as ${category}.`,
      });
    }

    const unitCost = parseNumericCell(draft.values.unitCost);
    const unitPrice = parseNumericCell(draft.values.unitPrice);
    if (unitCost == null) {
      rowIssues.push({
        code: "missing_cost",
        severity: "warning",
        row: draft.originalRow,
        message: `Row ${draft.originalRow}: wholesale cost is missing and will use 0.`,
      });
    }
    if (unitPrice == null) {
      rowIssues.push({
        code: "missing_price",
        severity: "warning",
        row: draft.originalRow,
        message: `Row ${draft.originalRow}: retail price is missing and will use 0.`,
      });
    }

    const sku = String(draft.values.sku ?? "").trim() || undefined;
    const color = String(draft.values.color ?? "").trim() || undefined;
    const duplicateKey = (sku || `${styleName}|${color ?? ""}`).toLowerCase();
    const duplicateOf = seen.get(duplicateKey);
    if (duplicateOf) {
      rowIssues.push({
        code: "possible_duplicate",
        severity: "warning",
        row: draft.originalRow,
        message: `Row ${draft.originalRow}: possible duplicate of row ${duplicateOf}.`,
      });
    } else {
      seen.set(duplicateKey, draft.originalRow);
    }

    const hash = contentHash(draft, styleName);
    const sourceUrl = String(draft.values.imageUrl ?? "").trim() || undefined;
    const row: ParsedCatalogRow = {
      originalRow: draft.originalRow,
      temporaryId: `row-${draft.originalRow}-${hash.slice(0, 10)}`,
      sku,
      styleName,
      category,
      color,
      brand: String(draft.values.brand ?? "").trim() || undefined,
      unitCost: unitCost ?? 0,
      unitPrice: unitPrice ?? 0,
      imageUrl: draft.imageRef
        ? `/api/catalog-images?path=${encodeURIComponent(draft.imageRef)}`
        : sourceUrl,
      description,
      imageRef: draft.imageRef,
      sourceUrl,
      rawRow: draft.rawRow,
      validationStatus: rowIssues.length > 0 ? "warning" : "valid",
      validationIssues: rowIssues,
      contentHash: hash,
    };
    rows.push(row);
    issues.push(...rowIssues);
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningRows = rows.filter((row) => row.validationStatus === "warning").length;

  return {
    items: rows.map(({ sku, styleName, category, color, brand, unitCost, unitPrice, imageUrl }) => ({
      sku,
      styleName,
      category,
      color,
      brand,
      unitCost,
      unitPrice,
      imageUrl,
    })),
    rows,
    issues,
    errors: issues.map((issue) => issue.message),
    mapping,
    headers,
    stats: {
      sheetName,
      rowCount: sourceRowCount,
      validRowCount: rows.length,
      warningCount: warningRows,
      errorCount,
      embeddedImageCount,
      categoryCount: new Set(rows.map((row) => row.category)).size,
    },
  };
}

async function parseWorkbookWithImages(buffer: ArrayBuffer, options: ParseOptions): Promise<ParsedCatalog> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return emptyCatalog({ code: "missing_sheet", severity: "error", message: "The file has no sheets." });
  }

  const headers = new Map<number, string>();
  const mapping: Record<string, CatalogField> = {};
  const columnFields = new Map<number, CatalogField>();
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = toCellText(cell.value);
    if (!header) return;
    headers.set(columnNumber, header);
    const field = options.columnMapping?.[header] ?? HEADER_ALIASES[normalizeHeader(header)];
    if (field) {
      columnFields.set(columnNumber, field);
      mapping[header] = field;
    }
  });

  if (![...columnFields.values()].includes("styleName")) {
    return emptyCatalog(
      {
        code: "missing_required_column",
        severity: "error",
        message: 'Missing an item-name column. Expected "style", "product", "name", or "שם פריט".',
      },
      sheet.name,
      mapping,
      [...headers.values()]
    );
  }

  const parseIssues: CatalogValidationIssue[] = [];
  const rowImageMap = new Map<number, string>();
  const images = sheet.getImages();
  if (options.onImage) {
    for (const image of images) {
      const media = workbook.model.media[Number(image.imageId)];
      if (!media || media.type !== "image" || !media.buffer) continue;
      const rowNumber = Math.round(image.range.tl.row) + 1;
      try {
        const imageRef = await options.onImage({
          buffer: Buffer.from(media.buffer as unknown as Uint8Array),
          extension: media.extension,
          rowNumber,
        });
        rowImageMap.set(rowNumber, imageRef);
      } catch {
        parseIssues.push({
          code: "image_upload_failed",
          severity: "warning",
          row: rowNumber,
          message: `Row ${rowNumber}: the embedded image could not be stored.`,
        });
      }
    }
  }

  const drafts: DraftRow[] = [];
  let sourceRowCount = 0;
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const sourceRow = sheet.getRow(rowNumber);
    const rawRow: Record<string, RawValue> = {};
    const values: DraftRow["values"] = {};
    let hasValue = false;

    for (const [columnNumber, header] of headers.entries()) {
      const cellValue = sourceRow.getCell(columnNumber).value;
      const rawValue = toRawValue(cellValue);
      rawRow[header] = rawValue;
      if (rawValue != null && rawValue !== "") hasValue = true;

      const field = columnFields.get(columnNumber);
      if (!field) continue;
      values[field] = field === "unitCost" || field === "unitPrice"
        ? parseNumericCell(cellValue)
        : toCellText(cellValue);
    }

    if (!hasValue) continue;
    sourceRowCount += 1;
    drafts.push({ originalRow: rowNumber, values, rawRow, imageRef: rowImageMap.get(rowNumber) });
  }

  return finalizeRows(drafts, mapping, [...headers.values()], sheet.name, parseIssues, sourceRowCount, images.length);
}

function parseSheetWorkbook(workbook: XLSX.WorkBook, options: ParseOptions): ParsedCatalog {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return emptyCatalog({ code: "missing_rows", severity: "error", message: "The file has no rows." });
  }

  const sheet = workbook.Sheets[sheetName];
  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (sourceRows.length === 0) {
    return emptyCatalog({ code: "missing_rows", severity: "error", message: "No rows were found in the catalog." }, sheetName);
  }

  const mapping: Record<string, CatalogField> = {};
  const headers = Object.keys(sourceRows[0]);
  for (const header of headers) {
    const field = options.columnMapping?.[header] ?? HEADER_ALIASES[normalizeHeader(header)];
    if (field) mapping[header] = field;
  }
  if (!Object.values(mapping).includes("styleName")) {
    return emptyCatalog(
      {
        code: "missing_required_column",
        severity: "error",
        message: 'Missing an item-name column. Expected "style", "product", "name", or "שם פריט".',
      },
      sheetName,
      mapping,
      headers
    );
  }

  const drafts = sourceRows.map((sourceRow, index): DraftRow => {
    const values: DraftRow["values"] = {};
    const rawRow: Record<string, RawValue> = {};
    for (const [header, value] of Object.entries(sourceRow)) {
      rawRow[header] = toRawValue(value);
      const field = mapping[header];
      if (!field) continue;
      values[field] = field === "unitCost" || field === "unitPrice"
        ? parseNumericCell(value)
        : toCellText(value);
    }
    return { originalRow: index + 2, values, rawRow };
  });

  return finalizeRows(drafts, mapping, headers, sheetName, [], sourceRows.length, 0);
}

function parseCsv(buffer: ArrayBuffer, options: ParseOptions): ParsedCatalog {
  // SheetJS treats raw byte arrays as legacy code pages for CSV. Decode UTF-8
  // explicitly so Hebrew supplier headers survive unchanged.
  const csvText = new TextDecoder("utf-8").decode(new Uint8Array(buffer));
  return parseSheetWorkbook(XLSX.read(csvText, { type: "string" }), options);
}

function parsePlainWorkbook(buffer: ArrayBuffer, options: ParseOptions): ParsedCatalog {
  return parseSheetWorkbook(XLSX.read(buffer, { type: "array" }), options);
}

export async function parseCatalogFile(
  buffer: ArrayBuffer,
  filename?: string,
  options: ParseOptions = {}
): Promise<ParsedCatalog> {
  if (filename?.toLowerCase().endsWith(".csv")) return parseCsv(buffer, options);

  try {
    return await parseWorkbookWithImages(buffer, options);
  } catch {
    // ExcelJS focuses on modern .xlsx files. SheetJS provides the compatibility
    // fallback for older supplier workbooks such as .xls.
    return parsePlainWorkbook(buffer, options);
  }
}
