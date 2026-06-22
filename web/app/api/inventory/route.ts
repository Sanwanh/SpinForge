// Inventory — web2-hybrid read (plan section E, inventory).
// The user's assets are platform-custodied on-chain; `ownership` is the source of
// truth for "who owns what". We list the user's active/embedded objects from the
// DB, hydrate their on-chain content via Sui multiGetObjects, and assert each is
// still owned by the platform custody (drift guard). Identity = session user.

import { NextRequest, NextResponse } from 'next/server';
import { requireGameUser } from '@/lib/server-user';
import { listInventory } from '@/lib/ownership';
import { getBeyImages } from '@/lib/bey-image';
import { getBeyBattleStats, type BeyStats } from '@/lib/bey-stats';
import { getSuiClient, PLATFORM_CUSTODY } from '@/lib/relay';
import { isSameOrigin, safeError } from '@/lib/api-guard';

interface InventoryItem {
  objectId: string;
  objectType: string;
  status: string;
  parentObjectId: string | null;
  content: unknown | null;
  onChainOwned: boolean;
  imageUrl: string | null;
}

// Overlay DB-derived battle stats onto a Bey's on-chain Move fields (immutably).
// Non-Bey objects and missing stats pass through unchanged.
function mergeBeyStats(objectType: string, content: unknown, stats?: BeyStats): unknown {
  if (objectType !== 'bey' || !stats || !content || typeof content !== 'object') return content;
  const c = content as { dataType?: string; fields?: Record<string, unknown> };
  if (c.dataType !== 'moveObject') return content;
  return {
    ...c,
    fields: {
      ...(c.fields ?? {}),
      wins: stats.wins,
      losses: stats.losses,
      burst_finishes: stats.burstFinishes,
      xtreme_finishes: stats.xtremeFinishes,
    },
  };
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

    // NFT-style photos + DB-derived battle stats, only for Beys (parts have none).
    const beyIds = owned.filter((o) => o.objectType === 'bey').map((o) => o.objectId);
    const [images, stats] = await Promise.all([getBeyImages(beyIds), getBeyBattleStats(beyIds)]);

    const items: InventoryItem[] = owned.map((o) => {
      const resp = byId.get(o.objectId);
      const ownerAddr =
        resp?.data?.owner && typeof resp.data.owner === 'object' && 'AddressOwner' in resp.data.owner
          ? (resp.data.owner as { AddressOwner: string }).AddressOwner
          : null;
      // The on-chain Bey fields (wins/losses/finishes) are never updated, so
      // overlay the authoritative DB-derived record onto the Bey's Move fields.
      const content = mergeBeyStats(o.objectType, resp?.data?.content ?? null, stats.get(o.objectId));
      return {
        objectId: o.objectId,
        objectType: o.objectType,
        status: o.status,
        parentObjectId: o.parentObjectId,
        content,
        // Embedded parts are children of a Bey (not directly address-owned), so
        // the custody check only applies to active, directly-owned objects.
        onChainOwned: o.status === 'embedded' ? true : ownerAddr === PLATFORM_CUSTODY,
        imageUrl: images.get(o.objectId) ?? null,
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (err) {
    return safeError(err, 'Inventory load failed');
  }
}
