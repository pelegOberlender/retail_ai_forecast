import * as XLSX from "xlsx";
import type { CatalogItemInput } from "@/lib/recommend";

const HEADER_ALIASES: Record<string, keyof CatalogItemInput> = {
  sku: "sku",
  "style code": "sku",
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
};

const REQUIRED: (keyof CatalogItemInput)[] = ["styleName", "category", "unitCost", "unitPrice"];

export type ParsedCatalog = {
  items: CatalogItemInput[];
  errors: string[];
};

export function parseCatalogFile(buffer: ArrayBuffer): ParsedCatalog {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { items: [], errors: ["The file has no sheets/rows."] };

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    return { items: [], errors: ["No rows found in the catalog file."] };
  }

  // Map whatever headers the file has onto our known fields.
  const sample = rows[0];
  const fieldMap = new Map<string, keyof CatalogItemInput>();
  for (const rawHeader of Object.keys(sample)) {
    const normalized = rawHeader.trim().toLowerCase();
    const mapped = HEADER_ALIASES[normalized];
    if (mapped) fieldMap.set(rawHeader, mapped);
  }

  const mappedFields = new Set(fieldMap.values());
  const missing = REQUIRED.filter((f) => !mappedFields.has(f));
  if (missing.length > 0) {
    return {
      items: [],
      errors: [
        `Missing required column(s): ${missing.join(", ")}. Expected headers like: style, category, cost, price.`,
      ],
    };
  }

  const items: CatalogItemInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, idx) => {
    const record: Partial<CatalogItemInput> = {};
    for (const [rawHeader, field] of fieldMap.entries()) {
      const value = row[rawHeader];
      if (field === "unitCost" || field === "unitPrice") {
        const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
        (record as Record<string, unknown>)[field] = Number.isFinite(num) ? num : undefined;
      } else {
        const str = String(value ?? "").trim();
        (record as Record<string, unknown>)[field] = str || undefined;
      }
    }

    if (!record.styleName || !record.category || record.unitCost == null || record.unitPrice == null) {
      errors.push(`Row ${idx + 2}: missing required value, skipped.`);
      return;
    }

    items.push({
      sku: record.sku,
      styleName: record.styleName,
      category: record.category,
      color: record.color,
      brand: record.brand,
      unitCost: record.unitCost,
      unitPrice: record.unitPrice,
      imageUrl: record.imageUrl,
    });
  });

  return { items, errors };
}
