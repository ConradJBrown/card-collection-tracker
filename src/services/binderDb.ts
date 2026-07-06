import { Binder, BinderEntry } from '../types';
import { db, DbEntry } from './db';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Sync handler infrastructure ───────────────────────────────────────────────

export interface BinderSyncHandlers {
  onUpsertBinder?: (binder: Binder) => Promise<void>;
  onDeleteBinder?: (binderId: string) => Promise<void>;
  onUpsertBinderEntry?: (entry: BinderEntry) => Promise<void>;
  onDeleteBinderEntry?: (binderId: string, entryId: string) => Promise<void>;
  onSyncError?: (error: Error) => void;
}

let binderSyncHandlers: BinderSyncHandlers = {};

export function configureBinderSync(handlers: BinderSyncHandlers) {
  binderSyncHandlers = handlers;
}

function toSyncError(error: unknown, op: string): Error {
  return error instanceof Error
    ? new Error(`${op}: ${error.message}`)
    : new Error(`${op}: ${String(error)}`);
}

async function syncBinder(id: string) {
  if (!binderSyncHandlers.onUpsertBinder) return;
  try {
    const binder = await db.binders.get(id);
    if (!binder) return;
    await binderSyncHandlers.onUpsertBinder(binder);
  } catch (error) {
    binderSyncHandlers.onSyncError?.(toSyncError(error, 'Binder sync upsert failed'));
  }
}

async function syncDeleteBinder(id: string) {
  if (!binderSyncHandlers.onDeleteBinder) return;
  try {
    await binderSyncHandlers.onDeleteBinder(id);
  } catch (error) {
    binderSyncHandlers.onSyncError?.(toSyncError(error, 'Binder sync delete failed'));
  }
}

async function syncBinderEntry(id: string) {
  if (!binderSyncHandlers.onUpsertBinderEntry) return;
  try {
    const entry = await db.binder_entries.get(id);
    if (!entry) return;
    await binderSyncHandlers.onUpsertBinderEntry(entry);
  } catch (error) {
    binderSyncHandlers.onSyncError?.(toSyncError(error, 'Binder entry sync upsert failed'));
  }
}

async function syncDeleteBinderEntry(binderId: string, entryId: string) {
  if (!binderSyncHandlers.onDeleteBinderEntry) return;
  try {
    await binderSyncHandlers.onDeleteBinderEntry(binderId, entryId);
  } catch (error) {
    binderSyncHandlers.onSyncError?.(toSyncError(error, 'Binder entry sync delete failed'));
  }
}

// ── Binder CRUD ───────────────────────────────────────────────────────────────

export async function createBinder(name: string, description?: string): Promise<Binder> {
  const now = new Date().toISOString();
  const binder: Binder = {
    id: generateId(),
    name: name.trim(),
    description: description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.binders.add(binder);
  void syncBinder(binder.id);
  return binder;
}

export async function updateBinder(
  id: string,
  patch: Partial<Pick<Binder, 'name' | 'description'>>
) {
  const changes: Partial<Binder> = { updatedAt: new Date().toISOString() };
  if (patch.name !== undefined) changes.name = patch.name.trim();
  if (patch.description !== undefined) changes.description = patch.description.trim() || undefined;
  await db.binders.update(id, changes);
  void syncBinder(id);
}

export async function deleteBinder(id: string): Promise<void> {
  await db.transaction('rw', db.binders, db.binder_entries, async () => {
    await db.binder_entries.where('binderId').equals(id).delete();
    await db.binders.delete(id);
  });
  void syncDeleteBinder(id);
}

export async function listBinders(): Promise<Binder[]> {
  return db.binders.orderBy('createdAt').reverse().toArray();
}

// ── Binder-Entry CRUD ─────────────────────────────────────────────────────────

export interface BinderEntryWithCard extends BinderEntry {
  card: DbEntry | undefined;
}

/**
 * Add a collection card to a binder. If the card is already in the binder the
 * entry is updated in-place. Throws if the card isn't in the collection or if
 * `sellQty` exceeds the collection quantity.
 */
export async function addCardToBinder(
  binderId: string,
  collectionEntryId: string,
  sellQty = 1,
  askingPrice?: number,
  notes?: string
): Promise<BinderEntry> {
  const collectionCard = await db.collection.get(collectionEntryId);
  if (!collectionCard) {
    throw new Error('Card not found in collection.');
  }
  if (sellQty < 1 || sellQty > collectionCard.quantity) {
    throw new Error(
      `Sell quantity must be between 1 and ${collectionCard.quantity}.`
    );
  }

  // Check for an existing entry for this card in this binder
  const existing = await db.binder_entries
    .where('[binderId+collectionEntryId]')
    .equals([binderId, collectionEntryId])
    .first();

  if (existing) {
    const updated: Partial<BinderEntry> = { sellQty };
    if (askingPrice !== undefined) updated.askingPrice = askingPrice;
    if (notes !== undefined) updated.notes = notes;
    await db.binder_entries.update(existing.id, updated);
    await db.binders.update(binderId, { updatedAt: new Date().toISOString() });
    void syncBinderEntry(existing.id);
    return { ...existing, ...updated };
  }

  const now = new Date().toISOString();
  const entry: BinderEntry = {
    id: generateId(),
    binderId,
    collectionEntryId,
    sellQty,
    askingPrice,
    notes,
    addedAt: now,
  };
  await db.binder_entries.add(entry);
  await db.binders.update(binderId, { updatedAt: now });
  void syncBinder(binderId);
  void syncBinderEntry(entry.id);
  return entry;
}

export async function removeCardFromBinder(entryId: string): Promise<void> {
  const entry = await db.binder_entries.get(entryId);
  await db.binder_entries.delete(entryId);
  if (entry) {
    await db.binders.update(entry.binderId, { updatedAt: new Date().toISOString() });
    void syncBinder(entry.binderId);
    void syncDeleteBinderEntry(entry.binderId, entryId);
  }
}

export async function updateBinderEntry(
  id: string,
  patch: Partial<Pick<BinderEntry, 'sellQty' | 'askingPrice' | 'notes'>>
): Promise<void> {
  // Validate sellQty against current collection quantity if it's being changed
  if (patch.sellQty !== undefined) {
    const entry = await db.binder_entries.get(id);
    if (entry) {
      const card = await db.collection.get(entry.collectionEntryId);
      if (card && patch.sellQty > card.quantity) {
        throw new Error(`Sell quantity cannot exceed collection quantity (${card.quantity}).`);
      }
      if (patch.sellQty < 1) {
        throw new Error('Sell quantity must be at least 1.');
      }
    }
  }
  await db.binder_entries.update(id, patch);
  void syncBinderEntry(id);
}

/** Returns binder entries with the matching collection card attached. */
export async function listBinderEntries(binderId: string): Promise<BinderEntryWithCard[]> {
  const entries = await db.binder_entries.where('binderId').equals(binderId).toArray();
  const cardIds = [...new Set(entries.map((e) => e.collectionEntryId))];
  const cards = await db.collection.bulkGet(cardIds);
  const cardMap = new Map<string, DbEntry>();
  cards.forEach((c) => { if (c) cardMap.set(c.id, c); });

  return entries.map((e) => ({ ...e, card: cardMap.get(e.collectionEntryId) }));
}
