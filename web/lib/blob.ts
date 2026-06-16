// Thin wrapper over Vercel Blob for user-uploaded images. Isolated here so the
// rest of the app depends on a tiny interface, not on the storage vendor — swap
// this file to move to S3/R2/etc. without touching callers.
//
// Requires the `BLOB_READ_WRITE_TOKEN` env var (auto-injected on Vercel when a
// Blob store is linked; set it locally to test). When absent, uploads fail with
// a clear error instead of crashing, so the rest of registration still works.

import { put, del } from '@vercel/blob';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// content-type -> file extension for the allowed image formats.
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export class ImageValidationError extends Error {}

/** Validate an uploaded image at the boundary. Throws ImageValidationError. */
export function validateImage(file: File): string {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new ImageValidationError('Unsupported image type (use JPEG, PNG, or WebP)');
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError('Image must be between 1 byte and 5 MB');
  }
  return ext;
}

export interface UploadedImage {
  url: string;
  path: string;
}

/**
 * Upload an already-validated image under a caller-chosen prefix. The random
 * suffix (addRandomSuffix) prevents collisions and guessable URLs.
 */
export async function uploadImage(prefix: string, file: File): Promise<UploadedImage> {
  if (!isBlobConfigured()) {
    throw new Error('Image storage is not configured (BLOB_READ_WRITE_TOKEN missing)');
  }
  const ext = validateImage(file);
  const blob = await put(`${prefix}.${ext}`, file, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.type,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { url: blob.url, path: blob.pathname };
}

/** Best-effort delete of a previously uploaded blob; never throws. */
export async function deleteImage(pathOrUrl: string | null | undefined): Promise<void> {
  if (!pathOrUrl || !isBlobConfigured()) return;
  try {
    await del(pathOrUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    // A leaked blob is harmless; swallow so a failed cleanup never breaks the flow.
  }
}
