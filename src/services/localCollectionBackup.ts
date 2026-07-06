import localforage from 'localforage';
import { DbEntry } from './db';

const BACKUP_KEY = 'phase2-guest-collection-backup';
const BACKUP_META_KEY = 'phase2-guest-collection-backup-meta';

interface CollectionBackupMeta {
  updatedAt: string;
  totalEntries: number;
}

export interface CollectionBackupSummary {
  totalEntries: number;
  updatedAt: string | null;
}

export async function getCollectionBackupEntries(): Promise<DbEntry[]> {
  return (await localforage.getItem<DbEntry[]>(BACKUP_KEY)) ?? [];
}

export async function saveCollectionBackup(entries: DbEntry[]) {
  await localforage.setItem(BACKUP_KEY, entries);
  await localforage.setItem<CollectionBackupMeta>(BACKUP_META_KEY, {
    updatedAt: new Date().toISOString(),
    totalEntries: entries.length,
  });
}

export async function ensureCollectionBackup(entries: DbEntry[]) {
  const existing = await getCollectionBackupEntries();
  if (existing.length === 0 && entries.length > 0) {
    await saveCollectionBackup(entries);
  }
}

export async function getCollectionBackupSummary(): Promise<CollectionBackupSummary> {
  const meta = await localforage.getItem<CollectionBackupMeta>(BACKUP_META_KEY);

  if (!meta) {
    return { totalEntries: 0, updatedAt: null };
  }

  return {
    totalEntries: meta.totalEntries,
    updatedAt: meta.updatedAt,
  };
}
