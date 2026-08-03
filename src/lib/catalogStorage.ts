import "server-only";
import { randomUUID } from "node:crypto";
import { createCatalogThumbnail } from "@/lib/catalogImages";
import { createAdminClient } from "@/lib/supabase/admin";

const CATALOG_BUCKET = "catalog-images";
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;
const SIGNED_URL_CACHE_MS = 45 * 60 * 1000;
const MAX_SIGNED_URL_CACHE_ENTRIES = 2_000;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

let bucketReady: Promise<void> | null = null;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

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
  const thumbnail = await createCatalogThumbnail(input.buffer);
  const path = `${input.catalogImportId}/row-${input.rowNumber}-${randomUUID()}.webp`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(CATALOG_BUCKET).upload(path, thumbnail, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

function validCatalogImagePath(path: string): boolean {
  return Boolean(path) && !path.includes("..") && !path.startsWith("/");
}

function pruneSignedUrlCache(now: number): void {
  for (const [path, entry] of signedUrlCache) {
    if (entry.expiresAt <= now) signedUrlCache.delete(path);
  }
  while (signedUrlCache.size > MAX_SIGNED_URL_CACHE_ENTRIES) {
    const oldestPath = signedUrlCache.keys().next().value;
    if (!oldestPath) break;
    signedUrlCache.delete(oldestPath);
  }
}

export async function createSignedCatalogImageUrls(paths: string[]): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(paths.filter(validCatalogImagePath))];
  if (uniquePaths.length === 0) return new Map();

  const now = Date.now();
  pruneSignedUrlCache(now);
  const urls = new Map<string, string>();
  const missingPaths: string[] = [];
  for (const path of uniquePaths) {
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt > now) urls.set(path, cached.url);
    else missingPaths.push(path);
  }
  if (missingPaths.length === 0) return urls;

  await catalogBucketReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(CATALOG_BUCKET)
    .createSignedUrls(missingPaths, SIGNED_URL_LIFETIME_SECONDS);
  if (error) throw error;

  for (const item of data ?? []) {
    if (!item.path || !item.signedUrl || item.error) continue;
    urls.set(item.path, item.signedUrl);
    signedUrlCache.set(item.path, { url: item.signedUrl, expiresAt: now + SIGNED_URL_CACHE_MS });
  }
  pruneSignedUrlCache(now);
  return urls;
}

export async function downloadCatalogImage(path: string): Promise<{ body: Blob; contentType: string }> {
  if (!validCatalogImagePath(path)) {
    throw new Error("Invalid catalog image path.");
  }
  await catalogBucketReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(CATALOG_BUCKET).download(path);
  if (error || !data) throw error ?? new Error("Catalog image was not found.");
  return { body: data, contentType: data.type || MIME_BY_EXTENSION[path.split(".").pop() ?? ""] || "image/png" };
}
