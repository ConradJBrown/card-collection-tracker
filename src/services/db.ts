import Dexie, { type Table } from 'dexie';
import { GameType } from '../types';

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
  quantity: number;
  condition: 'Mint' | 'Near Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played' | 'Damaged';
  addedAt: string;
}

class CollectionDb extends Dexie {
  collection!: Table<DbEntry, string>;

  constructor() {
    super('CardCollectionDb');
    this.version(1).stores({
      // Primary key: id. Indexed columns follow.
      collection: 'id, game, [game+name], [game+addedAt], [game+quantity], [game+type], [game+set]',
    });
  }
}

export const db = new CollectionDb();

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
}

export async function removeCard(id: string) {
  await db.collection.delete(id);
}

export async function incrementQty(id: string) {
  const entry = await db.collection.get(id);
  if (!entry) return;
  await db.collection.update(id, { quantity: entry.quantity + 1 });
}

export async function decrementQty(id: string) {
  const entry = await db.collection.get(id);
  if (!entry) return;
  if (entry.quantity <= 1) {
    await db.collection.delete(id);
  } else {
    await db.collection.update(id, { quantity: entry.quantity - 1 });
  }
}

export async function setCondition(id: string, condition: DbEntry['condition']) {
  await db.collection.update(id, { condition });
}
