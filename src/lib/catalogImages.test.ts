import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { createCatalogThumbnail } from "./catalogImages";

test("creates a bounded webp catalog thumbnail", async () => {
  const source = await sharp({
    create: {
      width: 1_200,
      height: 1_600,
      channels: 3,
      background: { r: 74, g: 83, b: 77 },
    },
  }).jpeg({ quality: 92 }).toBuffer();

  const thumbnail = await createCatalogThumbnail(source);
  const metadata = await sharp(thumbnail).metadata();

  assert.equal(metadata.format, "webp");
  assert.ok((metadata.width ?? 0) <= 360);
  assert.ok((metadata.height ?? 0) <= 480);
});
