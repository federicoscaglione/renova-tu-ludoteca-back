import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

const BUCKET = process.env.GAMES_IMAGES_BUCKET?.trim();
const REGION = process.env.AWS_REGION ?? process.env.COGNITO_REGION ?? "us-east-1";
const MAX_WIDTH_FULL = 1200;
const MAX_WIDTH_THUMB = 300;
const WEBP_QUALITY = 85;

const s3Client = new S3Client({ region: REGION });

function getBucket(): string {
  if (!BUCKET) throw new Error("GAMES_IMAGES_BUCKET no configurado");
  return BUCKET;
}

/** Build public URL for an S3 key (bucket must allow public GetObject). */
export function publicUrl(key: string): string {
  const bucket = getBucket();
  return `https://${bucket}.s3.${REGION}.amazonaws.com/${key}`;
}

/** Extract S3 key from a public URL we produced (games/...). */
export function keyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, "");
    if (path.startsWith("games/")) return path;
  } catch {
    // ignore
  }
  return null;
}

/** Key for thumbnail: games/{gameId}/thumbs/{filename} */
function thumbKeyFromFullKey(fullKey: string): string {
  const lastSlash = fullKey.lastIndexOf("/");
  if (lastSlash === -1) return fullKey;
  const path = fullKey.slice(0, lastSlash);
  const filename = fullKey.slice(lastSlash + 1);
  return `${path}/thumbs/${filename}`;
}

/**
 * Process image buffer: resize to full (max 1200px) and thumb (max 300px), upload both to S3.
 * Returns the public URL of the full-size image.
 */
export async function uploadGameImage(gameId: string, inputBuffer: Buffer): Promise<string> {
  const bucket = getBucket();
  const uuid = randomUUID();
  const fullKey = `games/${gameId}/${uuid}.webp`;
  const thumbKey = `games/${gameId}/thumbs/${uuid}.webp`;

  const [fullBuffer, thumbBuffer] = await Promise.all([
    sharp(inputBuffer)
      .resize(MAX_WIDTH_FULL, undefined, { withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
    sharp(inputBuffer)
      .resize(MAX_WIDTH_THUMB, undefined, { withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
  ]);

  await Promise.all([
    s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fullKey,
        Body: fullBuffer,
        ContentType: "image/webp",
      })
    ),
    s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: "image/webp",
      })
    ),
  ]);

  const url = publicUrl(fullKey);
  logger.info({ gameId, fullKey, thumbKey }, "Game image uploaded");
  return url;
}

/**
 * Delete one image (and its thumbnail) from S3 by its full URL.
 */
export async function deleteByUrl(url: string): Promise<void> {
  const key = keyFromUrl(url);
  if (!key) {
    logger.warn({ url }, "Could not parse S3 key from URL, skipping delete");
    return;
  }
  const bucket = getBucket();
  const thumbKey = thumbKeyFromFullKey(key);
  await Promise.all([
    s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })),
    s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: thumbKey })),
  ]);
  logger.info({ key, thumbKey }, "Game image deleted from S3");
}

/**
 * Delete multiple images (and their thumbnails) from S3.
 */
export async function deleteByUrls(urls: string[]): Promise<void> {
  await Promise.all(urls.map((url) => deleteByUrl(url)));
}
