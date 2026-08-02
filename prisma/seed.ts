import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  "Outerwear",
  "Knitwear",
  "Dresses",
  "Tops",
  "Bottoms",
  "Denim",
  "Accessories",
  "Footwear",
] as const;

const STYLES: Record<(typeof CATEGORIES)[number], string[]> = {
  Outerwear: ["Wool Overcoat", "Belted Trench", "Quilted Jacket", "Shearling Coat", "Utility Parka"],
  Knitwear: ["Cashmere Sweater", "Ribbed Cardigan", "Turtleneck Knit", "Merino Pullover", "Cable Knit Vest"],
  Dresses: ["Wrap Midi Dress", "Slip Dress", "Shirt Dress", "Knit Bodycon", "Linen Maxi Dress"],
  Tops: ["Silk Blouse", "Poplin Shirt", "Cropped Tee", "Linen Tank", "Puff-Sleeve Top"],
  Bottoms: ["Tailored Trouser", "Pleated Skirt", "Wide-Leg Pant", "Cargo Pant", "A-Line Skirt"],
  Denim: ["Straight Leg Jean", "Wide Leg Jean", "Denim Skirt", "Denim Jacket", "Skinny Jean"],
  Accessories: ["Leather Belt", "Structured Tote", "Silk Scarf", "Statement Earrings", "Crossbody Bag"],
  Footwear: ["Leather Loafer", "Ankle Boot", "Block Heel", "Canvas Sneaker", "Strappy Sandal"],
};

const COLORS = ["Black", "Ivory", "Camel", "Olive", "Navy", "Terracotta", "Sage", "Chocolate", "Stone", "Blush"];
const SIZES = ["XS", "S", "M", "L", "XL"];
const BRANDS = ["Modo Label", "Aria & Co.", "North Fields", "Lior Studio", "Maison Vale"];

// Deterministic pseudo-random so the dataset is reproducible across seed runs.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const range = (min: number, max: number) => Math.round(min + rand() * (max - min));

// Category-level performance bias so recommendations have realistic signal to learn from.
const CATEGORY_PERFORMANCE: Record<(typeof CATEGORIES)[number], number> = {
  Outerwear: 0.78,
  Knitwear: 0.82,
  Dresses: 0.68,
  Tops: 0.74,
  Bottoms: 0.65,
  Denim: 0.85,
  Accessories: 0.6,
  Footwear: 0.7,
};

// Past quarters we have historic order data for, most recent first.
const PAST_QUARTERS = [
  "2025-Q2",
  "2025-Q1",
  "2024-Q4",
  "2024-Q3",
  "2024-Q2",
  "2024-Q1",
  "2023-Q4",
  "2023-Q3",
];

function quarterToDate(quarter: string) {
  const [year, q] = quarter.split("-Q");
  const month = (parseInt(q, 10) - 1) * 3;
  return new Date(parseInt(year, 10), month, range(1, 27));
}

async function seedHistoricOrders() {
  await prisma.historicOrder.deleteMany();

  const rows: {
    sku: string;
    styleName: string;
    category: string;
    color: string;
    size: string;
    brand: string;
    season: string;
    orderDate: Date;
    qtyOrdered: number;
    qtySold: number;
    unitCost: number;
    unitPrice: number;
    revenue: number;
    sellThroughPct: number;
  }[] = [];

  let skuCounter = 1000;

  for (const quarter of PAST_QUARTERS) {
    for (const category of CATEGORIES) {
      const styles = STYLES[category];
      const perf = CATEGORY_PERFORMANCE[category];

      // Slight seasonal swing: outerwear/knitwear do better in Q4/Q1, dresses/tops better Q2/Q3.
      const [, qNum] = quarter.split("-Q");
      const isColdQuarter = qNum === "4" || qNum === "1";
      const seasonalBoost =
        (isColdQuarter && (category === "Outerwear" || category === "Knitwear")) ||
        (!isColdQuarter && (category === "Dresses" || category === "Tops"))
          ? 0.12
          : 0;

      for (const style of styles) {
        // 2-3 colorways per style per quarter
        const colorCount = range(2, 3);
        const usedColors = new Set<string>();
        for (let i = 0; i < colorCount; i++) {
          let color = pick(COLORS);
          while (usedColors.has(color)) color = pick(COLORS);
          usedColors.add(color);

          const brand = pick(BRANDS);
          const unitCost = Math.round((range(18, 90) + rand() * 20) * 100) / 100;
          const unitPrice = Math.round(unitCost * (2.1 + rand() * 0.9) * 100) / 100;

          const qtyOrdered = range(40, 220);
          const sellThroughBase = Math.min(0.97, Math.max(0.15, perf + seasonalBoost + (rand() - 0.5) * 0.25));
          const qtySold = Math.round(qtyOrdered * sellThroughBase);
          const revenue = Math.round(qtySold * unitPrice * 100) / 100;
          const sellThroughPct = Math.round(sellThroughBase * 1000) / 10;

          skuCounter += 1;
          const sizeSample = pick(SIZES);

          rows.push({
            sku: `MD-${category.slice(0, 3).toUpperCase()}-${skuCounter}`,
            styleName: style,
            category,
            color,
            size: sizeSample,
            brand,
            season: quarter,
            orderDate: quarterToDate(quarter),
            qtyOrdered,
            qtySold,
            unitCost,
            unitPrice,
            revenue,
            sellThroughPct,
          });
        }
      }
    }
  }

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await prisma.historicOrder.createMany({ data: rows.slice(i, i + chunkSize) });
  }

  console.log(`Seeded ${rows.length} historic order rows across ${PAST_QUARTERS.length} quarters.`);
}

seedHistoricOrders()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
