import { Binder, BinderEntry } from '../types';
import { requireSupabaseClient } from './supabaseClient';

// ── Row shapes ────────────────────────────────────────────────────────────────

interface CloudBinderRow {
  user_id: string;
  binder_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface CloudBinderEntryRow {
  user_id: string;
  binder_id: string;
  entry_id: string;
  collection_entry_id: string;
  sell_qty: number;
  asking_price: number | null;
  notes: string | null;
  added_at: string;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function binderToRow(userId: string, binder: Binder): CloudBinderRow {
  return {
    user_id: userId,
    binder_id: binder.id,
    name: binder.name,
    description: binder.description ?? null,
    created_at: binder.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function rowToBinder(row: CloudBinderRow): Binder {
  return {
    id: row.binder_id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function binderEntryToRow(userId: string, entry: BinderEntry): CloudBinderEntryRow {
  return {
    user_id: userId,
    binder_id: entry.binderId,
    entry_id: entry.id,
    collection_entry_id: entry.collectionEntryId,
    sell_qty: entry.sellQty,
    asking_price: entry.askingPrice ?? null,
    notes: entry.notes ?? null,
    added_at: entry.addedAt,
  };
}

function rowToBinderEntry(row: CloudBinderEntryRow): BinderEntry {
  return {
    id: row.entry_id,
    binderId: row.binder_id,
    collectionEntryId: row.collection_entry_id,
    sellQty: row.sell_qty,
    askingPrice: row.asking_price ?? undefined,
    notes: row.notes ?? undefined,
    addedAt: row.added_at,
  };
}

// ── Cloud operations ──────────────────────────────────────────────────────────

export async function listCloudBinders(userId: string): Promise<Binder[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('binders')
    .select('user_id, binder_id, name, description, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list cloud binders: ${error.message}`);
  return ((data ?? []) as unknown as CloudBinderRow[]).map(rowToBinder);
}

export async function listCloudBinderEntries(userId: string): Promise<BinderEntry[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('binder_entries')
    .select('user_id, binder_id, entry_id, collection_entry_id, sell_qty, asking_price, notes, added_at')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to list cloud binder entries: ${error.message}`);
  return ((data ?? []) as unknown as CloudBinderEntryRow[]).map(rowToBinderEntry);
}

export async function upsertCloudBinder(userId: string, binder: Binder): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('binders')
    .upsert(binderToRow(userId, binder), { onConflict: 'user_id,binder_id' });

  if (error) throw new Error(`Failed to upsert cloud binder: ${error.message}`);
}

export async function deleteCloudBinder(userId: string, binderId: string): Promise<void> {
  const client = requireSupabaseClient();
  // binder_entries cascade deletes via FK
  const { error } = await client
    .from('binders')
    .delete()
    .eq('user_id', userId)
    .eq('binder_id', binderId);

  if (error) throw new Error(`Failed to delete cloud binder: ${error.message}`);
}

export async function upsertCloudBinderEntry(userId: string, entry: BinderEntry): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('binder_entries')
    .upsert(binderEntryToRow(userId, entry), { onConflict: 'user_id,binder_id,entry_id' });

  if (error) throw new Error(`Failed to upsert cloud binder entry: ${error.message}`);
}

export async function deleteCloudBinderEntry(
  userId: string,
  binderId: string,
  entryId: string
): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('binder_entries')
    .delete()
    .eq('user_id', userId)
    .eq('binder_id', binderId)
    .eq('entry_id', entryId);

  if (error) throw new Error(`Failed to delete cloud binder entry: ${error.message}`);
}
