import { DbEntry } from './db';
import { requireSupabaseClient } from './supabaseClient';

interface CloudCollectionRow {
  user_id: string;
  entry_id: string;
  card_id: string;
  game: DbEntry['game'];
  name: string;
  image_url: string;
  type: string | null;
  set_name: string | null;
  rarity: string | null;
  description: string | null;
  quantity: number;
  condition: DbEntry['condition'];
  added_at: string;
  updated_at: string;
}

const COLLECTION_COLUMNS = [
  'user_id',
  'entry_id',
  'card_id',
  'game',
  'name',
  'image_url',
  'type',
  'set_name',
  'rarity',
  'description',
  'quantity',
  'condition',
  'added_at',
  'updated_at',
].join(', ');

function toCloudRow(userId: string, entry: DbEntry): CloudCollectionRow {
  return {
    user_id: userId,
    entry_id: entry.id,
    card_id: entry.cardId,
    game: entry.game,
    name: entry.name,
    image_url: entry.imageUrl,
    type: entry.type ?? null,
    set_name: entry.set ?? null,
    rarity: entry.rarity ?? null,
    description: entry.description ?? null,
    quantity: entry.quantity,
    condition: entry.condition,
    added_at: entry.addedAt,
    updated_at: new Date().toISOString(),
  };
}

function toDbEntry(row: CloudCollectionRow): DbEntry {
  return {
    id: row.entry_id,
    cardId: row.card_id,
    game: row.game,
    name: row.name,
    imageUrl: row.image_url,
    type: row.type ?? undefined,
    set: row.set_name ?? undefined,
    rarity: row.rarity ?? undefined,
    description: row.description ?? undefined,
    quantity: row.quantity,
    condition: row.condition,
    addedAt: row.added_at,
  };
}

export async function listCloudCollection(userId: string): Promise<DbEntry[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('collection_entries')
    .select(COLLECTION_COLUMNS)
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list cloud collection: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as CloudCollectionRow[];
  return rows.map((row) => toDbEntry(row));
}

export async function upsertCloudCollectionEntry(userId: string, entry: DbEntry) {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('collection_entries')
    .upsert(toCloudRow(userId, entry), { onConflict: 'user_id,entry_id' });

  if (error) {
    throw new Error(`Failed to upsert cloud collection entry: ${error.message}`);
  }
}

export async function upsertCloudCollectionEntries(userId: string, entries: DbEntry[]) {
  if (entries.length === 0) {
    return;
  }

  const client = requireSupabaseClient();
  const { error } = await client
    .from('collection_entries')
    .upsert(entries.map((entry) => toCloudRow(userId, entry)), {
      onConflict: 'user_id,entry_id',
    });

  if (error) {
    throw new Error(`Failed to upsert cloud collection entries: ${error.message}`);
  }
}

export async function deleteCloudCollectionEntry(userId: string, entryId: string) {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('collection_entries')
    .delete()
    .eq('user_id', userId)
    .eq('entry_id', entryId);

  if (error) {
    throw new Error(`Failed to delete cloud collection entry: ${error.message}`);
  }
}
