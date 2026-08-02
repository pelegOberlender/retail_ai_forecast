import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildHistoricOrderWhere, parseFilters } from "@/lib/historicOrders";
import { buildXlsxResponse } from "@/lib/xlsx";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filters = parseFilters(searchParams);
  const where = buildHistoricOrderWhere(filters);
  const format = searchParams.get("format");

  const orders = await prisma.historicOrder.findMany({
    where,
    orderBy: [{ season: "desc" }, { category: "asc" }, { styleName: "asc" }],
  });

  if (format === "xlsx") {
    const rows = orders.map((o) => ({
      SKU: o.sku,
      Style: o.styleName,
      Category: o.category,
      Color: o.color,
      Size: o.size,
      Brand: o.brand,
      Quarter: o.season,
      "Order Date": o.orderDate.toISOString().slice(0, 10),
      "Qty Ordered": o.qtyOrdered,
      "Qty Sold": o.qtySold,
      "Unit Cost": o.unitCost,
      "Unit Price": o.unitPrice,
      Revenue: o.revenue,
      "Sell-Through %": o.sellThroughPct,
    }));
    return buildXlsxResponse([{ name: "Historic Orders", rows }], "historic-orders.xlsx");
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.revenue, 0);
  const avgSellThrough =
    orders.length > 0 ? orders.reduce((sum, o) => sum + o.sellThroughPct, 0) / orders.length : 0;
  const totalUnitsSold = orders.reduce((sum, o) => sum + o.qtySold, 0);

  return Response.json({
    orders,
    summary: {
      count: orders.length,
      totalRevenue,
      avgSellThrough,
      totalUnitsSold,
    },
  });
}
