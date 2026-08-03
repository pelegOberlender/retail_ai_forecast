import { createHash } from "node:crypto";
import { posix as pathPosix } from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
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
  "בר קוד פריט": "sku",
  "מקט פריט": "sku",
  "שם פריט": "styleName",
  "תיאור פריט": "description",
  צבע: "color",
  מותג: "brand",
  "תמונת פריט": "imageUrl",
  "מקור פריט": "description",
};

type WorkbookHeader = {
  rowNumber: number;
  headers: Map<number, string>;
  mapping: Record<string, CatalogField>;
  columnFields: Map<number, CatalogField>;
};

type EmbeddedWorkbookImage = {
  rowNumber: number;
  buffer: Buffer;
  extension: string;
};

function xmlAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:]+)="([^"]*)"/g)) attributes[match[1]] = match[2];
  return attributes;
}

function xmlTags(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map((match) => match[0]);
}

async function zipText(zip: JSZip, path: string): Promise<string | null> {
  return (await zip.file(path)?.async("string")) ?? null;
}

async function extractRichCellImages(
  buffer: ArrayBuffer,
  workbook: ExcelJS.Workbook
): Promise<EmbeddedWorkbookImage[]> {
  const zip = await JSZip.loadAsync(buffer);
  const [workbookXml, workbookRelsXml, metadataXml, richValuesXml, richValueRelsXml, richValueRelationshipsXml] =
    await Promise.all([
      zipText(zip, "xl/workbook.xml"),
      zipText(zip, "xl/_rels/workbook.xml.rels"),
      zipText(zip, "xl/metadata.xml"),
      zipText(zip, "xl/richData/rdrichvalue.xml"),
      zipText(zip, "xl/richData/richValueRel.xml"),
      zipText(zip, "xl/richData/_rels/richValueRel.xml.rels"),
    ]);

  if (
    !workbookXml ||
    !workbookRelsXml ||
    !metadataXml ||
    !richValuesXml ||
    !richValueRelsXml ||
    !richValueRelationshipsXml
  ) {
    return [];
  }

  const firstSheet = xmlTags(workbookXml, "sheet")[0];
  const sheetRelationshipId = firstSheet ? xmlAttributes(firstSheet)["r:id"] : null;
  if (!sheetRelationshipId) return [];

  const workbookRelationships = new Map(
    xmlTags(workbookRelsXml, "Relationship").map((tag) => {
      const attributes = xmlAttributes(tag);
      return [attributes.Id, attributes.Target];
    })
  );
  const sheetTarget = workbookRelationships.get(sheetRelationshipId);
  if (!sheetTarget) return [];
  const sheetPath = sheetTarget.startsWith("/")
    ? sheetTarget.slice(1)
    : pathPosix.normalize(pathPosix.join("xl", sheetTarget));
  const sheetXml = await zipText(zip, sheetPath);
  if (!sheetXml) return [];

  const metadataRichValueIndexes = xmlTags(metadataXml, "rc").map((tag) =>
    Number.parseInt(xmlAttributes(tag).v ?? "-1", 10)
  );
  const richValueRelationshipIndexes = [...richValuesXml.matchAll(/<rv\b[^>]*>([\s\S]*?)<\/rv>/g)].map(
    (match) => Number.parseInt(match[1].match(/<v>(\d+)<\/v>/)?.[1] ?? "-1", 10)
  );
  const relationshipIds = xmlTags(richValueRelsXml, "rel").map((tag) => xmlAttributes(tag)["r:id"]);
  const imageTargets = new Map(
    xmlTags(richValueRelationshipsXml, "Relationship").map((tag) => {
      const attributes = xmlAttributes(tag);
      return [attributes.Id, attributes.Target];
    })
  );
  const mediaByName = new Map(
    (workbook.model.media ?? [])
      .filter((media) => media.type === "image" && media.buffer)
      .map((media) => [media.name, media])
  );

  const images: EmbeddedWorkbookImage[] = [];
  for (const cellTag of xmlTags(sheetXml, "c")) {
    const attributes = xmlAttributes(cellTag);
    const metadataPosition = Number.parseInt(attributes.vm ?? "0", 10) - 1;
    if (metadataPosition < 0) continue;

    const richValueIndex = metadataRichValueIndexes[metadataPosition];
    const relationshipIndex = richValueRelationshipIndexes[richValueIndex];
    const relationshipId = relationshipIds[relationshipIndex];
    const target = imageTargets.get(relationshipId);
    const rowNumber = Number.parseInt(attributes.r?.match(/\d+$/)?.[0] ?? "0", 10);
    if (!target || rowNumber < 1) continue;

    const fileName = pathPosix.basename(target);
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "png";
    const mediaName = fileName.slice(0, -(extension.length + 1));
    const media = mediaByName.get(mediaName);
    if (!media?.buffer) continue;
    images.push({ rowNumber, extension, buffer: Buffer.from(media.buffer as unknown as Uint8Array) });
  }
  return images;
}

function detectWorkbookHeader(sheet: ExcelJS.Worksheet, options: ParseOptions): WorkbookHeader | null {
  let bestRecognized: (WorkbookHeader & { recognizedCount: number }) | null = null;
  let fallback: WorkbookHeader | null = null;

  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 20); rowNumber += 1) {
    const headers = new Map<number, string>();
    sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const header = toCellText(cell.value);
      if (header && header.length <= 120) headers.set(columnNumber, header);
    });
    if (headers.size === 0) continue;

    const mapping: Record<string, CatalogField> = {};
    const columnFields = new Map<number, CatalogField>();
    for (const [columnNumber, header] of headers.entries()) {
      const field = options.columnMapping?.[header] ?? HEADER_ALIASES[normalizeHeader(header)];
      if (!field) continue;
      mapping[header] = field;
      columnFields.set(columnNumber, field);
    }
    const candidate = { rowNumber, headers, mapping, columnFields };
    const recognizedCount = columnFields.size;
    if (!fallback && headers.size >= 2) fallback = candidate;
    if (!bestRecognized || recognizedCount > bestRecognized.recognizedCount) {
      bestRecognized = { ...candidate, recognizedCount };
    }
  }

  if (bestRecognized && bestRecognized.recognizedCount > 0) return bestRecognized;
  return fallback;
}

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

  const detectedHeader = detectWorkbookHeader(sheet, options);
  if (!detectedHeader) {
    return emptyCatalog({ code: "missing_rows", severity: "error", message: "No rows were found in the catalog." }, sheet.name);
  }
  const { rowNumber: headerRowNumber, headers, mapping, columnFields } = detectedHeader;

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
  const richCellImages = await extractRichCellImages(buffer, workbook);
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
    for (const image of richCellImages) {
      try {
        const imageRef = await options.onImage(image);
        rowImageMap.set(image.rowNumber, imageRef);
      } catch {
        parseIssues.push({
          code: "image_upload_failed",
          severity: "warning",
          row: image.rowNumber,
          message: `Row ${image.rowNumber}: the in-cell image could not be stored.`,
        });
      }
    }
  }

  const drafts: DraftRow[] = [];
  let sourceRowCount = 0;
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
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

  return finalizeRows(
    drafts,
    mapping,
    [...headers.values()],
    sheet.name,
    parseIssues,
    sourceRowCount,
    images.length + richCellImages.length
  );
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
