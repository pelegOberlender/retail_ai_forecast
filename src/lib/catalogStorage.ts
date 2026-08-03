import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const CATALOG_BUCKET = "catalog-images";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

let bucketReady: Promise<void> | null = null;

function normalizedExtension(extension: string): string {
  const normalized = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return MIME_BY_EXTENSION[normalized] ? normalized : "png";
}

async function ensureCatalogBucket(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase catalog storage is not configured.");
  }

  const supabase = createAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;
  if (buckets.some((bucket) => bucket.name === CATALOG_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(CATALOG_BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });
  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw createError;
  }
}

async function catalogBucketReady(): Promise<void> {
  bucketReady ??= ensureCatalogBucket().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return bucketReady;
}

export async function uploadCatalogImage(input: {
  catalogImportId: string;
  rowNumber: number;
  extension: string;
  buffer: Buffer;
}): Promise<string> {
  await catalogBucketReady();
  const extension = normalizedExtension(input.extension);
  const path = `${input.catalogImportId}/row-${input.rowNumber}-${randomUUID()}.${extension}`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(CATALOG_BUCKET).upload(path, input.buffer, {
    contentType: MIME_BY_EXTENSION[extension],
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function downloadCatalogImage(path: string): Promise<{ body: Blob; contentType: string }> {
  if (!path || path.includes("..") || path.startsWith("/")) {
    throw new Error("Invalid catalog image path.");
  }
  await catalogBucketReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(CATALOG_BUCKET).download(path);
  if (error || !data) throw error ?? new Error("Catalog image was not found.");
  return { body: data, contentType: data.type || MIME_BY_EXTENSION[path.split(".").pop() ?? ""] || "image/png" };
}
