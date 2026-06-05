// Inventory — web2-hybrid read (plan section E, inventory).
// The user's assets are platform-custodied on-chain; `ownership` is the source of
// truth for "who owns what". We list the user's active/embedded objects from the
// DB, hydrate their on-chain content via Sui multiGetObjects, and assert each is
// still owned by the platform custody (drift guard). Identity = session user.

import { NextRequest, NextResponse } from 'next/server';
import { requireGameUser } from '@/lib/server-user';
import { listInventory } from '@/lib/ownership';
import { getSuiClient, PLATFORM_CUSTODY } from '@/lib/relay';
import { isSameOrigin, safeError } from '@/lib/api-guard';

interface InventoryItem {
  objectId: string;
  objectType: string;
  status: string;
  parentObjectId: string | null;
  content: unknown | null;
  onChainOwned: boolean;
}

export async function GET(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const owned = await listInventory(user.id);
    if (owned.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    const client = getSuiClient();
    const responses = await client.multiGetObjects({
      ids: owned.map((o) => o.objectId),
      options: { showContent: true, showOwner: true, showType: true },
    });

    // Index chain responses by objectId so the merge is order-independent.
    const byId = new Map<string, (typeof responses)[number]>();
    for (const r of responses) {
      const id = r.data?.objectId;
      if (id) byId.set(id, r);
    }

    const items: InventoryItem[] = owned.map((o) => {
      const resp = byId.get(o.objectId);
      const ownerAddr =
        resp?.data?.owner && typeof resp.data.owner === 'object' && 'AddressOwner' in resp.data.owner
          ? (resp.data.owner as { AddressOwner: string }).AddressOwner
          : null;
      return {
        objectId: o.objectId,
        objectType: o.objectType,
        status: o.status,
        parentObjectId: o.parentObjectId,
        content: resp?.data?.content ?? null,
        // Embedded parts are children of a Bey (not directly address-owned), so
        // the custody check only applies to active, directly-owned objects.
        onChainOwned: o.status === 'embedded' ? true : ownerAddr === PLATFORM_CUSTODY,
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (err) {
    return safeError(err, 'Inventory load failed');
  }
}
