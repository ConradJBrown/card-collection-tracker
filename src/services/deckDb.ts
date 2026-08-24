import { Deck, DeckEntry, GameType } from '../types';
import { db, DbEntry } from './db';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Deck CRUD ─────────────────────────────────────────────────────────────────

export async function createDeck(name: string, game: GameType, description?: string): Promise<Deck> {
  const now = new Date().toISOString();
  const deck: Deck = {
    id: generateId(),
    name: name.trim(),
    game,
    description: description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.decks.add(deck);
  return deck;
}

export async function updateDeck(
  id: string,
  patch: Partial<Pick<Deck, 'name' | 'description'>>
): Promise<void> {
  const changes: Partial<Deck> = { updatedAt: new Date().toISOString() };
  if (patch.name !== undefined) changes.name = patch.name.trim();
  if (patch.description !== undefined) changes.description = patch.description.trim() || undefined;
  await db.decks.update(id, changes);
}

export async function deleteDeck(id: string): Promise<void> {
  await db.transaction('rw', db.decks, db.deck_entries, async () => {
    await db.deck_entries.where('deckId').equals(id).delete();
    await db.decks.delete(id);
  });
}

export async function listDecks(): Promise<Deck[]> {
  return db.decks.orderBy('createdAt').reverse().toArray();
}

// ── Deck-Entry CRUD ───────────────────────────────────────────────────────────

export interface DeckEntryWithCard extends DeckEntry {
  card: DbEntry | undefined;
}

/**
 * Add a collection card to a deck. If the card is already in the deck the
 * quantity is incremented by 1 (up to collection qty).
 */
export async function addCardToDeck(
  deckId: string,
  collectionEntryId: string,
  quantity = 1
): Promise<DeckEntry> {
  const collectionCard = await db.collection.get(collectionEntryId);
  if (!collectionCard) {
    throw new Error('Card not found in collection.');
  }
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1.');
  }

  const existing = await db.deck_entries
    .where('[deckId+collectionEntryId]')
    .equals([deckId, collectionEntryId])
    .first();

  const now = new Date().toISOString();

  if (existing) {
    const newQty = existing.quantity + quantity;
    await db.deck_entries.update(existing.id, { quantity: newQty });
    await db.decks.update(deckId, { updatedAt: now });
    return { ...existing, quantity: newQty };
  }

  const entry: DeckEntry = {
    id: `${deckId}::${collectionEntryId}`,
    deckId,
    collectionEntryId,
    quantity,
    addedAt: now,
  };
  await db.deck_entries.add(entry);
  await db.decks.update(deckId, { updatedAt: now });
  return entry;
}

export async function removeCardFromDeck(entryId: string): Promise<void> {
  const entry = await db.deck_entries.get(entryId);
  await db.deck_entries.delete(entryId);
  if (entry) {
    await db.decks.update(entry.deckId, { updatedAt: new Date().toISOString() });
  }
}

export async function updateDeckEntryQuantity(
  id: string,
  quantity: number
): Promise<void> {
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1.');
  }
  const entry = await db.deck_entries.get(id);
  if (entry) {
    const card = await db.collection.get(entry.collectionEntryId);
    if (card && quantity > card.quantity) {
      throw new Error(`Quantity cannot exceed collection quantity (${card.quantity}).`);
    }
  }
  await db.deck_entries.update(id, { quantity });
}

/** Returns deck entries with the matching collection card attached. */
export async function listDeckEntries(deckId: string): Promise<DeckEntryWithCard[]> {
  const entries = await db.deck_entries.where('deckId').equals(deckId).toArray();
  const cardIds = [...new Set(entries.map((e) => e.collectionEntryId))];
  const cards = await db.collection.bulkGet(cardIds);
  const cardMap = new Map<string, DbEntry>();
  for (const c of cards) {
    if (c) cardMap.set(c.id, c);
  }
  return entries.map((e) => ({ ...e, card: cardMap.get(e.collectionEntryId) }));
}
