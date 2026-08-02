import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type HistoricOrderFilters = {
  season?: string;
  category?: string;
  brand?: string;
  q?: string;
};

export function buildHistoricOrderWhere(filters: HistoricOrderFilters): Prisma.HistoricOrderWhereInput {
  const where: Prisma.HistoricOrderWhereInput = {};
  if (filters.season) where.season = filters.season;
  if (filters.category) where.category = filters.category;
  if (filters.brand) where.brand = filters.brand;
  if (filters.q) {
    where.OR = [
      { styleName: { contains: filters.q } },
      { sku: { contains: filters.q } },
      { color: { contains: filters.q } },
    ];
  }
  return where;
}

export function parseFilters(searchParams: URLSearchParams): HistoricOrderFilters {
  return {
    season: searchParams.get("season") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  };
}

export async function getFilterOptions() {
  const [seasons, categories, brands] = await Promise.all([
    prisma.historicOrder.findMany({ distinct: ["season"], select: { season: true }, orderBy: { season: "desc" } }),
    prisma.historicOrder.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    prisma.historicOrder.findMany({ distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }),
  ]);
  return {
    seasons: seasons.map((s) => s.season),
    categories: categories.map((c) => c.category),
    brands: brands.map((b) => b.brand),
  };
}
