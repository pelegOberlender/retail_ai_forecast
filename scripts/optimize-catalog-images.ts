import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { createCatalogThumbnail } from "../src/lib/catalogImages";

loadEnvConfig(process.cwd());

const BATCH_SIZE = 3;
const BUCKET = "catalog-images";
const prisma = new PrismaClient();

async function optimizeProduct(product: {
  id: string;
  catalogImportId: string;
  originalRow: number;
  imageRef: string | null;
}) {
  if (!product.imageRef) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase Storage is not configured.");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(product.imageRef);
  if (downloadError || !data) throw downloadError ?? new Error("Image download failed.");
  const source = Buffer.from(await data.arrayBuffer());
  const thumbnail = await createCatalogThumbnail(source);
  const thumbnailPath = `${product.catalogImportId}/row-${product.originalRow}-${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(thumbnailPath, thumbnail, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  await prisma.catalogProduct.update({ where: { id: product.id }, data: { imageRef: thumbnailPath } });
  return { sourceBytes: source.byteLength, thumbnailBytes: thumbnail.byteLength };
}

async function main() {
  const products = await prisma.catalogProduct.findMany({
    where: { imageRef: { not: null, notIn: [""] } },
    select: { id: true, catalogImportId: true, originalRow: true, imageRef: true },
    orderBy: { createdAt: "asc" },
  });
  const pending = products.filter((product) => !product.imageRef?.toLowerCase().endsWith(".webp"));
  let optimized = 0;
  let failed = 0;
  let sourceBytes = 0;
  let thumbnailBytes = 0;

  for (let index = 0; index < pending.length; index += BATCH_SIZE) {
    const results = await Promise.allSettled(pending.slice(index, index + BATCH_SIZE).map(optimizeProduct));
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        optimized += 1;
        sourceBytes += result.value.sourceBytes;
        thumbnailBytes += result.value.thumbnailBytes;
      } else if (result.status === "rejected") {
        failed += 1;
      }
    }
  }

  console.log(JSON.stringify({
    scanned: products.length,
    optimized,
    skipped: products.length - pending.length,
    failed,
    sourceBytes,
    thumbnailBytes,
    reductionPct: sourceBytes > 0 ? Number(((1 - thumbnailBytes / sourceBytes) * 100).toFixed(1)) : 0,
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Catalog image optimization failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
