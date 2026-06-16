// Shared client-side shapes for the session + DB-backed inventory. The
// `/api/inventory` route joins the DB `ownership` table with on-chain object
// content (sui.multiGetObjects) and returns each asset with its Move `fields`
// merged in, so the existing visual components (PartGrid/PartCard/BeyCard/…)
// keep consuming the same `fields` they did under wallet queries.

export type PartKind = 'blade' | 'ratchet' | 'bit' | 'bey';

export interface PartObject {
  objectId: string;
  type: PartKind;
  fields: Record<string, unknown>;
  imageUrl?: string | null;
}

// Sui object `content` envelope (showContent). For moveObjects the struct lives
// under `content.fields`.
interface SuiMoveContent {
  dataType?: string;
  type?: string;
  fields?: Record<string, unknown> | unknown[];
}

// Raw item as returned by GET /api/inventory (ownership row + hydrated chain content).
export interface InventoryItem {
  objectId: string;
  objectType: string;
  status: string;
  parentObjectId: string | null;
  content: SuiMoveContent | null;
  onChainOwned?: boolean;
  imageUrl?: string | null;
}

export interface InventoryResponse {
  success?: boolean;
  items: InventoryItem[];
}

/** Pull the Move struct fields out of a Sui `content` envelope. */
function fieldsOf(content: SuiMoveContent | null): Record<string, unknown> {
  if (!content || content.dataType !== 'moveObject') return {};
  const raw = content.fields;
  // Sui's MoveStruct can be an array for some shapes — only objects carry fields.
  return Array.isArray(raw) ? {} : (raw ?? {});
}

/** Map a fully-qualified Move type string to our part kind, or null. */
export function classifyType(typeStr: string): PartKind | null {
  if (typeStr.includes('::blade::Blade')) return 'blade';
  if (typeStr.includes('::ratchet::Ratchet')) return 'ratchet';
  if (typeStr.includes('::bit::Bit')) return 'bit';
  if (typeStr.includes('::bey::Bey')) return 'bey';
  return null;
}

export interface SortedInventory {
  blades: PartObject[];
  ratchets: PartObject[];
  bits: PartObject[];
  beys: PartObject[];
}

const PART_KINDS: PartKind[] = ['blade', 'ratchet', 'bit', 'bey'];

/** Map a raw inventory item to the client PartObject shape (fields flattened). */
export function toPartObject(item: InventoryItem): PartObject | null {
  // `objectType` from /api/inventory is already the short kind ('blade'/…); fall
  // back to classifying the fully-qualified content type if it's something else.
  const kind = PART_KINDS.includes(item.objectType as PartKind)
    ? (item.objectType as PartKind)
    : classifyType(item.content?.type ?? '');
  if (!kind) return null;
  return {
    objectId: item.objectId,
    type: kind,
    fields: fieldsOf(item.content),
    imageUrl: item.imageUrl ?? null,
  };
}

/** Split a flat inventory item list into the four part buckets. */
export function sortInventory(items: InventoryItem[]): SortedInventory {
  const out: SortedInventory = { blades: [], ratchets: [], bits: [], beys: [] };
  for (const item of items) {
    const part = toPartObject(item);
    if (!part) continue;
    if (part.type === 'blade') out.blades.push(part);
    else if (part.type === 'ratchet') out.ratchets.push(part);
    else if (part.type === 'bit') out.bits.push(part);
    else out.beys.push(part);
  }
  return out;
}
