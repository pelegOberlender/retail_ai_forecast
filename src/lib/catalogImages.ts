import sharp from "sharp";

const THUMBNAIL_WIDTH = 360;
const THUMBNAIL_HEIGHT = 480;

export async function createCatalogThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { failOn: "none", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78, effort: 4, smartSubsample: true })
    .toBuffer();
}
