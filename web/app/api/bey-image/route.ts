// Attach (or replace) the photo of a registered Bey. The Bey must be an active
// asset the session user owns (DB ownership), so only the owner can set its
// photo. Bytes go to blob storage; the URL is recorded in `bey_images`.

import { NextRequest, NextResponse } from 'next/server';
import { requireGameUser } from '@/lib/server-user';
import { assertOwns } from '@/lib/ownership';
import { getBeyImagePath, setBeyImage } from '@/lib/bey-image';
import { uploadImage, deleteImage, isBlobConfigured, ImageValidationError } from '@/lib/blob';
import { isSameOrigin, safeError, rateLimited } from '@/lib/api-guard';

const ID_RE = /^0x[0-9a-fA-F]{2,64}$/;

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    if (!isBlobConfigured()) {
      return NextResponse.json(
        { error: 'Photo uploads are not enabled on this server.' },
        { status: 503 },
      );
    }
    const limited = await rateLimited(request, 'bey-image', 20, 3600);
    if (limited) return limited;

    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const form = await request.formData().catch(() => null);
    const beyId = form?.get('beyId');
    const file = form?.get('file');
    if (typeof beyId !== 'string' || !ID_RE.test(beyId)) {
      return NextResponse.json({ error: 'Invalid Bey id' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }

    const owns = await assertOwns(user.id, [beyId]);
    if (!owns) {
      return NextResponse.json({ error: 'You do not own this Bey' }, { status: 403 });
    }

    const previousPath = await getBeyImagePath(beyId);
    const uploaded = await uploadImage(`bey/${beyId}`, file);
    await setBeyImage(beyId, user.id, uploaded.url, uploaded.path);
    // Replace: drop the old blob after the new one is committed (best-effort).
    if (previousPath && previousPath !== uploaded.path) {
      await deleteImage(previousPath);
    }

    return NextResponse.json({ success: true, url: uploaded.url });
  } catch (err) {
    if (err instanceof ImageValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return safeError(err, 'Photo upload failed');
  }
}
