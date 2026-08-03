import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { parseCatalogFile } from "./parseCatalog";

function csvBuffer(value: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(value);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

test("parses recognized catalog columns and returns structured validation", async () => {
  const parsed = await parseCatalogFile(
    csvBuffer([
      "SKU,Style,Category,Color,Wholesale Cost,Retail Price,Brand",
      "MD-101,Essential Knit,Knitwear,Sage,25,79,Modo Label",
      "MD-102,City Trench,,Stone,45,129,Modo Label",
    ].join("\n")),
    "catalog.csv"
  );

  assert.equal(parsed.stats.rowCount, 2);
  assert.equal(parsed.stats.validRowCount, 2);
  assert.equal(parsed.stats.warningCount, 1);
  assert.equal(parsed.rows[1].category, "Outerwear");
  assert.equal(parsed.rows[1].validationIssues[0].code, "category_inferred");
  assert.equal(parsed.mapping.Style, "styleName");
});

test("supports Hebrew headers and decimal commas", async () => {
  const parsed = await parseCatalogFile(
    csvBuffer('ברקוד פריט,שם פריט,צבע,מותג,wholesale,retail\n12345,חולצת כותנה,לבן,MODO,"25,50","79,90"'),
    "catalog.csv"
  );

  assert.equal(parsed.rows[0].styleName, "חולצת כותנה");
  assert.equal(parsed.rows[0].sku, "12345");
  assert.equal(parsed.rows[0].unitCost, 25.5);
  assert.equal(parsed.rows[0].unitPrice, 79.9);
});

test("returns headers for manual mapping and accepts a mapped retry", async () => {
  const source = csvBuffer("Supplier Product,Family,Buy\nStudio Dress,Dresses,42");
  const failed = await parseCatalogFile(source, "supplier.csv");

  assert.equal(failed.rows.length, 0);
  assert.equal(failed.issues[0].code, "missing_required_column");
  assert.deepEqual(failed.headers, ["Supplier Product", "Family", "Buy"]);

  const mapped = await parseCatalogFile(source, "supplier.csv", {
    columnMapping: {
      "Supplier Product": "styleName",
      Family: "category",
      Buy: "unitCost",
    },
  });
  assert.equal(mapped.rows[0].styleName, "Studio Dress");
  assert.equal(mapped.rows[0].category, "Dresses");
  assert.equal(mapped.rows[0].unitCost, 42);
});

test("skips missing names and flags possible duplicates without dropping usable rows", async () => {
  const parsed = await parseCatalogFile(
    csvBuffer([
      "SKU,Style,Category,Cost,Price",
      "MD-1,Silk Shirt,Tops,20,60",
      "MD-1,Silk Shirt,Tops,20,60",
      "MD-3,,Tops,20,60",
    ].join("\n")),
    "catalog.csv"
  );

  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.stats.errorCount, 1);
  assert.equal(parsed.rows[1].validationIssues.some((issue) => issue.code === "possible_duplicate"), true);
});

test("uses the binary workbook fallback for legacy xls supplier files", async () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["SKU", "Style", "Category", "Cost", "Price"],
    ["LEG-1", "Legacy Trench", "Outerwear", 55, 149],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Catalog");
  const binary = XLSX.write(workbook, { bookType: "biff8", type: "array" }) as ArrayBuffer;

  const parsed = await parseCatalogFile(binary, "supplier.xls");

  assert.equal(parsed.stats.sheetName, "Catalog");
  assert.equal(parsed.rows[0].sku, "LEG-1");
  assert.equal(parsed.rows[0].styleName, "Legacy Trench");
});

test("detects a workbook header row after leading blank rows", async () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [],
    ["מותג", "שם פריט", "צבע", "מקט פריט"],
    ["MODO", "Tailored Jacket", "Graphite", "MOD-44"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "קטלוג");
  const binary = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;

  const parsed = await parseCatalogFile(binary, "supplier.xlsx");

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].originalRow, 3);
  assert.equal(parsed.rows[0].styleName, "Tailored Jacket");
  assert.equal(parsed.rows[0].sku, "MOD-44");
});
