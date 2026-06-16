'use client';

// Client-side upload of a Bey photo. The shared `api()` helper only sends JSON,
// so we fetch directly: the browser sets the multipart boundary and the
// same-origin Origin header the server's guard requires. Returns the public URL.

export const MAX_BEY_PHOTO_BYTES = 5 * 1024 * 1024;

export async function uploadBeyPhoto(beyId: string, file: File): Promise<string> {
  if (file.size > MAX_BEY_PHOTO_BYTES) {
    throw new Error('Image must be 5 MB or smaller');
  }
  const form = new FormData();
  form.append('beyId', beyId);
  form.append('file', file);
  const res = await fetch('/api/bey-image', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return data.url as string;
}
