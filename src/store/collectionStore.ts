import { create } from 'zustand';
import { DbEntry } from '../services/db';

export type SortBy = 'name' | 'quantity' | 'addedAt';

interface CollectionUIStore {
  searchTerm: string;
  sortBy: SortBy;
  sortDir: 'asc' | 'desc';
  filterType: string;
  filterSet: string;
  filterRarity: string;
  setSearchTerm: (v: string) => void;
  setSortBy: (v: SortBy) => void;
  setSortDir: (v: 'asc' | 'desc') => void;
  setFilterType: (v: string) => void;
  setFilterSet: (v: string) => void;
  setFilterRarity: (v: string) => void;
  resetFilters: () => void;
}

// Re-export condition type from DbEntry so consumers don't need to import db directly
export type CardCondition = DbEntry['condition'];

export const useCollectionStore = create<CollectionUIStore>((set) => ({
  searchTerm: '',
  sortBy: 'addedAt',
  sortDir: 'desc',
  filterType: '',
  filterSet: '',
  filterRarity: '',

  setSearchTerm: (v) => set({ searchTerm: v }),
  setSortBy: (v) => set({ sortBy: v }),
  setSortDir: (v) => set({ sortDir: v }),
  setFilterType: (v) => set({ filterType: v }),
  setFilterSet: (v) => set({ filterSet: v }),
  setFilterRarity: (v) => set({ filterRarity: v }),
  resetFilters: () => set({ searchTerm: '', filterType: '', filterSet: '', filterRarity: '' }),
}));
