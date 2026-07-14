import Dexie, { type Table } from 'dexie';
import { Binder, BinderEntry, GameType } from '../types';

export interface DbEntry {
  id: string; // "${game}-${cardId}"
  cardId: string;
  game: GameType;
  name: string;
  imageUrl: string;
  type?: string;
  set?: string;
  rarity?: string;
  description?: string;
  priceLow?: number;
  priceMid?: number;
  priceHigh?: number;
  estimatedPrice?: number;
  quantity: number;
  condition: 'Mint' | 'Near Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played' | 'Damaged';
  addedAt: string;
}

export interface CollectionSyncHandlers {
  onUpsert?: (entry: DbEntry) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSyncError?: (error: Error) => void;
}

class CollectionDb extends Dexie {
  collection!: Table<DbEntry, string>;
  binders!: Table<Binder, string>;
  binder_entries!: Table<BinderEntry, string>;

  constructor() {
    super('CardCollectionDb');
    this.version(1).stores({
      // Primary key: id. Indexed columns follow.
      collection: 'id, game, [game+name], [game+addedAt], [game+quantity], [game+type], [game+set]',
    });
    this.version(2).stores({
      collection: 'id, game, [game+name], [game+addedAt], [game+quantity], [game+type], [game+set]',
      binders: 'id, createdAt',
      binder_entries: 'id, binderId, collectionEntryId, [binderId+collectionEntryId]',
    });
  }
}

export const db = new CollectionDb();
let collectionSyncHandlers: CollectionSyncHandlers = {};

export function configureCollectionSync(handlers: CollectionSyncHandlers) {
  collectionSyncHandlers = handlers;
}

function toError(error: unknown, operation: string) {
  return error instanceof Error
    ? new Error(`${operation}: ${error.message}`)
    : new Error(`${operation}: ${String(error)}`);
}

async function syncEntry(id: string) {
  if (!collectionSyncHandlers.onUpsert) return;

  try {
    const entry = await db.collection.get(id);
    if (!entry) return;
    await collectionSyncHandlers.onUpsert(entry);
  } catch (error) {
    collectionSyncHandlers.onSyncError?.(toError(error, 'Collection sync upsert failed'));
  }
}

async function syncDelete(id: string) {
  if (!collectionSyncHandlers.onDelete) return;

  try {
    await collectionSyncHandlers.onDelete(id);
  } catch (error) {
    collectionSyncHandlers.onSyncError?.(toError(error, 'Collection sync delete failed'));
  }
}

export async function listCollectionEntries() {
  return db.collection.toArray();
}

export async function replaceCollection(entries: DbEntry[]) {
  await db.transaction('rw', db.collection, async () => {
    await db.collection.clear();
    if (entries.length > 0) {
      await db.collection.bulkPut(entries);
    }
  });
}

export async function bulkUpsertCollection(entries: DbEntry[]) {
  if (entries.length === 0) return;
  await db.collection.bulkPut(entries);
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export async function addOrIncrementCard(entry: Omit<DbEntry, 'quantity' | 'condition' | 'addedAt'>) {
  const existing = await db.collection.get(entry.id);
  if (existing) {
    await db.collection.update(entry.id, { quantity: existing.quantity + 1 });
  } else {
    await db.collection.add({
      ...entry,
      quantity: 1,
      condition: 'Near Mint',
      addedAt: new Date().toISOString(),
    });
  }

  void syncEntry(entry.id);
}

export async function removeCard(id: string) {
  await db.collection.delete(id);
  void syncDelete(id);
}

export async function incrementQty(id: string) {
  const entry = await db.collection.get(id);
  if (!entry) return;
  await db.collection.update(id, { quantity: entry.quantity + 1 });
  void syncEntry(id);
}

export async function decrementQty(id: string) {
  const entry = await db.collection.get(id);
  if (!entry) return;
  if (entry.quantity <= 1) {
    await db.collection.delete(id);
    void syncDelete(id);
  } else {
    await db.collection.update(id, { quantity: entry.quantity - 1 });
    void syncEntry(id);
  }
}

export async function setCondition(id: string, condition: DbEntry['condition']) {
  await db.collection.update(id, { condition });
  void syncEntry(id);
}
