'use client';

import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { uploadBeyPhoto, MAX_BEY_PHOTO_BYTES } from '@/lib/bey-photo-client';

const ACCEPT = 'image/jpeg,image/png,image/webp';

export interface BeyPhotoUploadProps {
  /** On-chain Bey object id the photo attaches to. */
  beyId: string;
  /** Existing photo URL, if any. */
  currentUrl?: string | null;
  /** Localized copy. */
  labels: {
    add: string;        // "Add a photo"
    replace: string;    // "Replace photo"
    uploading: string;  // "Uploading…"
    hint: string;       // "JPEG / PNG / WebP · max 5 MB"
    tooLarge: string;   // "Image must be 5 MB or smaller"
    failed: string;     // "Upload failed"
  };
  /** Called with the new public URL after a successful upload. */
  onUploaded?: (url: string) => void;
  /** Show the thumbnail preview inside the control (default true). */
  showPreview?: boolean;
}

/**
 * Owner-only control to attach or replace a Bey's NFT-style photo. Posts a
 * multipart request to `/api/bey-image` (the `api()` helper only does JSON, so
 * we fetch directly; the browser sets the multipart boundary and the same-origin
 * Origin header the server requires).
 */
export function BeyPhotoUpload({
  beyId,
  currentUrl,
  labels,
  onUploaded,
  showPreview = true,
}: BeyPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [status, setStatus] = useState<'idle' | 'uploading'>('idle');
  const [error, setError] = useState('');

  const upload = useCallback(
    async (file: File) => {
      if (file.size > MAX_BEY_PHOTO_BYTES) {
        setError(labels.tooLarge);
        return;
      }
      setStatus('uploading');
      setError('');
      try {
        const url = await uploadBeyPhoto(beyId, file);
        setPreview(url);
        onUploaded?.(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : labels.failed);
      } finally {
        setStatus('idle');
      }
    },
    [beyId, labels, onUploaded],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void upload(file);
      e.target.value = ''; // allow re-picking the same file
    },
    [upload],
  );

  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
      {showPreview && preview && (
        <img
          src={preview}
          alt=""
          style={{
            width: '100%',
            maxWidth: 220,
            aspectRatio: '1 / 1',
            objectFit: 'cover',
            borderRadius: 12,
            border: '1px solid var(--border)',
          }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onPick}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === 'uploading'}
        className="btn btn-ghost"
        style={{ fontSize: 12, padding: '8px 16px' }}
      >
        {status === 'uploading' ? labels.uploading : preview ? labels.replace : `📷 ${labels.add}`}
      </button>
      <div className="t-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
        {labels.hint}
      </div>
      {error && (
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--blood)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
