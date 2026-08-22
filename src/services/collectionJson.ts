import { db, DbEntry, CARD_CONDITIONS, bulkUpsertCollection } from './db';
import { Binder, BinderEntry } from '../types';

export interface CollectionExport {
  version: 1;
  exportedAt: string;
  collection: DbEntry[];
  binders: Binder[];
  binderEntries: BinderEntry[];
}

const VALID_GAMES = new Set(['yugioh', 'mtg', 'pokemon']);
const VALID_CONDITIONS = new Set<string>(CARD_CONDITIONS);

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isValidEntry(e: unknown): e is DbEntry {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    isString(obj['id']) &&
    isString(obj['cardId']) &&
    VALID_GAMES.has(obj['game'] as string) &&
    isString(obj['name']) &&
    isString(obj['imageUrl']) &&
    typeof obj['quantity'] === 'number' &&
    Number.isFinite(obj['quantity']) &&
    Number.isInteger(obj['quantity']) &&
    obj['quantity'] > 0 &&
    VALID_CONDITIONS.has(obj['condition'] as string) &&
    isString(obj['addedAt'])
  );
}

function isValidBinder(b: unknown): b is Binder {
  if (!b || typeof b !== 'object') return false;
  const obj = b as Record<string, unknown>;
  return (
    isString(obj['id']) && isString(obj['name']) && isString(obj['createdAt']) && isString(obj['updatedAt'])
  );
}

function isValidBinderEntry(e: unknown): e is BinderEntry {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    isString(obj['id']) &&
    isString(obj['binderId']) &&
    isString(obj['collectionEntryId']) &&
    typeof obj['sellQty'] === 'number' &&
    obj['sellQty'] > 0 &&
    isString(obj['addedAt'])
  );
}

export async function exportCollectionToJson(): Promise<void> {
  const collection = await db.collection.toArray();
  const binders = await db.binders.toArray();
  const binderEntries = await db.binder_entries.toArray();

  const payload: CollectionExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    collection,
    binders,
    binderEntries,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `card-collection-${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  collectionImported: number;
  bindersImported: number;
  binderEntriesImported: number;
  warnings: string[];
}

export async function importCollectionFromJson(file: File): Promise<ImportResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Invalid JSON file.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON file does not contain a valid object.');
  }

  const data = parsed as Record<string, unknown>;

  if (data['version'] !== 1) {
    throw new Error(`Unsupported export version: ${String(data['version'])}.`);
  }

  const rawCollection = Array.isArray(data['collection']) ? (data['collection'] as unknown[]) : [];
  const rawBinders = Array.isArray(data['binders']) ? (data['binders'] as unknown[]) : [];
  const rawBinderEntries = Array.isArray(data['binderEntries'])
    ? (data['binderEntries'] as unknown[])
    : [];

  const warnings: string[] = [];

  const validEntries = rawCollection.filter((e, i) => {
    if (isValidEntry(e)) return true;
    warnings.push(`Skipped collection entry at index ${i}: invalid or missing required fields.`);
    return false;
  }) as DbEntry[];

  const validBinders = rawBinders.filter((b, i) => {
    if (isValidBinder(b)) return true;
    warnings.push(`Skipped binder at index ${i}: invalid or missing required fields.`);
    return false;
  }) as Binder[];

  const validBinderEntries = rawBinderEntries.filter((e, i) => {
    if (isValidBinderEntry(e)) return true;
    warnings.push(`Skipped binder entry at index ${i}: invalid or missing required fields.`);
    return false;
  }) as BinderEntry[];

  await db.transaction('rw', db.collection, db.binders, db.binder_entries, async () => {
    if (validEntries.length > 0) await bulkUpsertCollection(validEntries);
    if (validBinders.length > 0) await db.binders.bulkPut(validBinders);
    if (validBinderEntries.length > 0) await db.binder_entries.bulkPut(validBinderEntries);
  });

  return {
    collectionImported: validEntries.length,
    bindersImported: validBinders.length,
    binderEntriesImported: validBinderEntries.length,
    warnings,
  };
}
