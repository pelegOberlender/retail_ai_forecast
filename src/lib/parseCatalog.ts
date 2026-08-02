import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { CatalogItemInput } from "@/lib/recommend";

// Column headers we recognize, English and Hebrew — real retailer catalogs
// (linesheets exported from a brand/PLM system) commonly use Hebrew headers
// like "שם פריט" (item name) or "תמונת פריט" (item image, an embedded image
// rather than a URL).
const HEADER_ALIASES: Record<string, keyof CatalogItemInput | "description"> = {
  // English
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
  // Hebrew (real-world catalog export)
  "ברקוד פריט": "sku",
  "שם פריט": "styleName",
  "תיאור פריט": "description",
  "צבע": "color",
  "מותג": "brand",
  "תמונת פריט": "imageUrl",
  "מקור פריט": "description",
};

const REQUIRED: (keyof CatalogItemInput)[] = ["styleName"];

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

function inferCategory(text: string): string {
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return cat;
  }
  return "Uncategorized";
}

export type ParsedCatalog = {
  items: CatalogItemInput[];
  errors: string[];
};

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

async function saveImageBuffer(buffer: Buffer, extension: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "catalog");
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${extension || "png"}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/catalog/${filename}`;
}

function parseNumericCell(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  const num = parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? num : undefined;
}

/**
 * .xlsx/.xls path — uses ExcelJS so we can also pull embedded product photos
 * (a plain cell-value reader like SheetJS can't see them) and map each image
 * to the row it's anchored to.
 */
async function parseWorkbookWithImages(buffer: ArrayBuffer): Promise<ParsedCatalog> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { items: [], errors: ["The file has no sheets."] };

  const headerRow = sheet.getRow(1);
  const colToField = new Map<number, keyof CatalogItemInput | "description">();
  headerRow.eachCell((cell, colNumber) => {
    const mapped = HEADER_ALIASES[normalizeHeader(String(cell.value ?? ""))];
    if (mapped) colToField.set(colNumber, mapped);
  });

  const mappedFields = new Set(colToField.values());
  const missing = REQUIRED.filter((f) => !mappedFields.has(f));
  if (missing.length > 0) {
    return {
      items: [],
      errors: [
        `Missing required column(s): ${missing.join(", ")}. Expected a header like "style", "product", or "שם פריט".`,
      ],
    };
  }

  // Map each embedded image to the row it's anchored to.
  const rowImageMap = new Map<number, string>();
  const images = sheet.getImages();
  for (const img of images) {
    const media = workbook.model.media[Number(img.imageId)];
    if (!media || media.type !== "image" || !media.buffer) continue;
    const rowNumber = Math.round(img.range.tl.row) + 1; // anchors are 0-indexed; rows are 1-indexed
    try {
      // exceljs's own typings declare a weaker ambient `Buffer` (just `extends
      // ArrayBuffer`) that shadows Node's real Buffer type — normalize explicitly.
      const url = await saveImageBuffer(Buffer.from(media.buffer as unknown as Uint8Array), media.extension);
      rowImageMap.set(rowNumber, url);
    } catch {
      // Non-fatal — the row just won't have a photo.
    }
  }

  const items: CatalogItemInput[] = [];
  const errors: string[] = [];

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const record: Partial<CatalogItemInput> & { description?: string } = {};
    for (const [colNumber, field] of colToField.entries()) {
      const cell = row.getCell(colNumber);
      const value = cell.value;
      if (field === "unitCost" || field === "unitPrice") {
        record[field] = parseNumericCell(value);
      } else if (field === "description") {
        record.description = String(value ?? "").trim() || undefined;
      } else {
        const str = typeof value === "object" && value && "text" in value ? String((value as { text: unknown }).text) : String(value ?? "");
        (record as Record<string, unknown>)[field] = str.trim() || undefined;
      }
    }

    if (!record.styleName) {
      if (Object.values(record).some(Boolean)) errors.push(`Row ${r}: missing item name, skipped.`);
      continue;
    }

    const category = record.category ?? inferCategory(`${record.styleName} ${record.description ?? ""}`);

    items.push({
      sku: record.sku,
      styleName: record.styleName,
      category,
      color: record.color,
      brand: record.brand,
      unitCost: record.unitCost ?? 0,
      unitPrice: record.unitPrice ?? 0,
      imageUrl: rowImageMap.get(r) ?? record.imageUrl,
    });
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push("No usable rows found in the catalog file.");
  }
  if (items.some((i) => i.unitCost === 0 || i.unitPrice === 0)) {
    errors.push(
      "Some items had no cost/price column — recommended quantities were still generated, but totals for those lines will show as $0 until pricing is added."
    );
  }

  return { items, errors };
}

/** .csv path — SheetJS handles delimited text fine; there are no embedded images to extract. */
function parseCsv(buffer: ArrayBuffer): ParsedCatalog {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { items: [], errors: ["The file has no rows."] };

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) return { items: [], errors: ["No rows found in the catalog file."] };

  const fieldMap = new Map<string, keyof CatalogItemInput | "description">();
  for (const rawHeader of Object.keys(rows[0])) {
    const mapped = HEADER_ALIASES[normalizeHeader(rawHeader)];
    if (mapped) fieldMap.set(rawHeader, mapped);
  }

  const mappedFields = new Set(fieldMap.values());
  const missing = REQUIRED.filter((f) => !mappedFields.has(f));
  if (missing.length > 0) {
    return {
      items: [],
      errors: [`Missing required column(s): ${missing.join(", ")}. Expected a header like "style" or "product".`],
    };
  }

  const items: CatalogItemInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, idx) => {
    const record: Partial<CatalogItemInput> & { description?: string } = {};
    for (const [rawHeader, field] of fieldMap.entries()) {
      const value = row[rawHeader];
      if (field === "unitCost" || field === "unitPrice") {
        record[field] = parseNumericCell(value);
      } else if (field === "description") {
        record.description = String(value ?? "").trim() || undefined;
      } else {
        (record as Record<string, unknown>)[field] = String(value ?? "").trim() || undefined;
      }
    }

    if (!record.styleName) {
      errors.push(`Row ${idx + 2}: missing item name, skipped.`);
      return;
    }

    const category = record.category ?? inferCategory(`${record.styleName} ${record.description ?? ""}`);

    items.push({
      sku: record.sku,
      styleName: record.styleName,
      category,
      color: record.color,
      brand: record.brand,
      unitCost: record.unitCost ?? 0,
      unitPrice: record.unitPrice ?? 0,
      imageUrl: record.imageUrl,
    });
  });

  return { items, errors };
}

export async function parseCatalogFile(buffer: ArrayBuffer, filename?: string): Promise<ParsedCatalog> {
  const isCsv = filename?.toLowerCase().endsWith(".csv");
  if (isCsv) return parseCsv(buffer);

  try {
    return await parseWorkbookWithImages(buffer);
  } catch {
    // Fall back to the plain-cell reader for files ExcelJS can't open (e.g. legacy .xls).
    return parseCsv(buffer);
  }
}
