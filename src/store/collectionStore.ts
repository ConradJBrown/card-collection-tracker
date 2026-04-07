import { create } from 'zustand';
import localforage from 'localforage';
import { CardResult, CollectionEntry, GameType } from '../types';

const STORAGE_KEY = 'collection';

interface CollectionStore {
  collection: Record<string, CollectionEntry>;
  addCard: (card: CardResult) => void;
  removeCard: (key: string) => void;
  incrementQty: (key: string) => void;
  decrementQty: (key: string) => void;
  setCondition: (key: string, condition: CollectionEntry['condition']) => void;
  getByGame: (game: GameType) => CollectionEntry[];
}

const saveToStorage = (collection: Record<string, CollectionEntry>) => {
  localforage.setItem(STORAGE_KEY, collection).catch(() => {});
};

const loadInitial = async (set: (partial: Partial<CollectionStore>) => void) => {
  const saved = await localforage.getItem<Record<string, CollectionEntry>>(STORAGE_KEY);
  if (saved) set({ collection: saved });
};

export const useCollectionStore = create<CollectionStore>((set, get) => {
  loadInitial(set);

  return {
    collection: {},

    addCard: (card) => {
      const key = `${card.game}-${card.id}`;
      const existing = get().collection[key];
      const updated: Record<string, CollectionEntry> = {
        ...get().collection,
        [key]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : {
              card,
              quantity: 1,
              condition: 'Near Mint',
              addedAt: new Date().toISOString(),
            },
      };
      set({ collection: updated });
      saveToStorage(updated);
    },

    removeCard: (key) => {
      const updated = { ...get().collection };
      delete updated[key];
      set({ collection: updated });
      saveToStorage(updated);
    },

    incrementQty: (key) => {
      const entry = get().collection[key];
      if (!entry) return;
      const updated = {
        ...get().collection,
        [key]: { ...entry, quantity: entry.quantity + 1 },
      };
      set({ collection: updated });
      saveToStorage(updated);
    },

    decrementQty: (key) => {
      const entry = get().collection[key];
      if (!entry) return;
      if (entry.quantity <= 1) {
        const updated = { ...get().collection };
        delete updated[key];
        set({ collection: updated });
        saveToStorage(updated);
      } else {
        const updated = {
          ...get().collection,
          [key]: { ...entry, quantity: entry.quantity - 1 },
        };
        set({ collection: updated });
        saveToStorage(updated);
      }
    },

    setCondition: (key, condition) => {
      const entry = get().collection[key];
      if (!entry) return;
      const updated = {
        ...get().collection,
        [key]: { ...entry, condition },
      };
      set({ collection: updated });
      saveToStorage(updated);
    },

    getByGame: (game) => {
      return Object.values(get().collection).filter((e) => e.card.game === game);
    },
  };
});
