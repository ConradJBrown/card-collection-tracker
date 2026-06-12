import localforage from 'localforage';
import type { CollectionEntry } from '../types';
import { bulkUpsertCollection, DbEntry } from './db';

const LEGACY_COLLECTION_KEY = 'collection';

export async function migrateLegacyCollection() {
  const oldCollection = await localforage.getItem<Record<string, CollectionEntry>>(LEGACY_COLLECTION_KEY);

  if (!oldCollection) {
    return;
  }

  const rows: DbEntry[] = Object.entries(oldCollection).map(([id, entry]) => ({
    id,
    cardId: entry.card.id,
    game: entry.card.game,
    name: entry.card.name,
    imageUrl: entry.card.imageUrl,
    type: entry.card.type,
    set: entry.card.set,
    rarity: entry.card.rarity,
    description: entry.card.description,
    quantity: entry.quantity,
    condition: entry.condition,
    addedAt: entry.addedAt,
  }));

  await bulkUpsertCollection(rows);
  await localforage.removeItem(LEGACY_COLLECTION_KEY);
}
