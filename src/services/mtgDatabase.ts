import { CardResult } from '../types';

interface BulkDataItem {
  id: string;
  type: string;
  name: string;
  description: string;
  download_uri: string;
  updated_at: string;
  size: number;
}

interface BulkDataResponse {
  object: string;
  has_more: boolean;
  data: BulkDataItem[];
}

interface ScryfallCard {
  id: string;
  name: string;
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  type_line?: string;
  oracle_text?: string;
}

interface DatabaseMetadata {
  lastUpdated: string;
  version: string;
  cardCount: number;
}

const DB_NAME = 'mtg-cards';
const STORE_NAME = 'cards';
const METADATA_KEY = 'metadata';
const SEARCH_INDEX_KEY = 'searchIndex';

class MTGDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  async getMetadata(): Promise<DatabaseMetadata | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(METADATA_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async setMetadata(metadata: DatabaseMetadata): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(metadata, METADATA_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async clearDatabase(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async setSearchIndex(index: Record<string, CardResult>): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(index, SEARCH_INDEX_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSearchIndex(): Promise<Record<string, CardResult> | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(SEARCH_INDEX_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async downloadAndIndex(
    onProgress?: (progress: { loaded: number; total: number; status: string }) => void
  ): Promise<void> {
    try {
      // Fetch bulk data metadata
      if (onProgress) onProgress({ loaded: 0, total: 100, status: 'Fetching metadata...' });
      const metaRes = await fetch('https://api.scryfall.com/bulk-data');
      if (!metaRes.ok) throw new Error('Failed to fetch bulk data metadata');

      const bulkData: BulkDataResponse = await metaRes.json();
      const oracleData = bulkData.data.find((item) => item.type === 'oracle_cards');
      if (!oracleData) throw new Error('Oracle cards bulk data not found');

      const totalSize = oracleData.size;
      if (onProgress) onProgress({ loaded: 0, total: totalSize, status: 'Downloading MTG database...' });

      // Download the gzipped JSON
      const downloadRes = await fetch(oracleData.download_uri);
      if (!downloadRes.ok) throw new Error('Failed to download MTG database');

      // Read response as ArrayBuffer and decompress
      const buffer = await downloadRes.arrayBuffer();
      const decompressed = await this.decompressGzip(buffer);
      const jsonString = new TextDecoder().decode(decompressed);

      if (onProgress) onProgress({ loaded: totalSize, total: totalSize, status: 'Processing cards...' });

      // Parse JSON and build search index
      const cards: ScryfallCard[] = JSON.parse(jsonString);
      const searchIndex: Record<string, CardResult> = {};

      cards.forEach((card) => {
        const key = card.name.toLowerCase();
        searchIndex[key] = {
          id: card.id,
          name: card.name,
          imageUrl:
            card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? '',
          game: 'mtg',
          type: card.type_line,
          description: card.oracle_text,
        };
      });

      // Clear old data and save new index
      await this.clearDatabase();
      await this.setSearchIndex(searchIndex);

      const metadata: DatabaseMetadata = {
        lastUpdated: new Date().toISOString(),
        version: oracleData.updated_at,
        cardCount: cards.length,
      };
      await this.setMetadata(metadata);

      if (onProgress)
        onProgress({ loaded: totalSize, total: totalSize, status: `Successfully indexed ${cards.length} cards` });
    } catch (error) {
      throw error;
    }
  }

  private async decompressGzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Use native DecompressionStream if available (modern browsers)
    if ('DecompressionStream' in globalThis) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        },
      });

      const decompressed = stream.pipeThrough(
        new (globalThis as any).DecompressionStream('gzip')
      );

      const reader = decompressed.getReader() as ReadableStreamDefaultReader<Uint8Array>;
      const chunks: Uint8Array[] = [];

      const readChunk = async (): Promise<ArrayBuffer> => {
        const { done, value } = await reader.read();
        if (done) {
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          return result.buffer;
        }
        if (value) {
          chunks.push(value);
        }
        return readChunk();
      };

      return readChunk();
    }

    // Fallback: use pako library if available
    throw new Error(
      'Decompression not available. This browser does not support gzip decompression. Please use a modern browser (Chrome 80+, Firefox 79+, Safari 16.4+).'
    );
  }

  async searchLocal(query: string): Promise<CardResult[]> {
    const index = await this.getSearchIndex();
    if (!index) return [];

    const lowerQuery = query.toLowerCase();
    const results = Object.values(index).filter(
      (card) =>
        card.name.toLowerCase().includes(lowerQuery) ||
        card.type?.toLowerCase().includes(lowerQuery)
    );

    return results.slice(0, 50); // Limit to 50 results
  }
}

export const mtgDatabase = new MTGDatabase();
