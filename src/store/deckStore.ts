import { create } from 'zustand';

interface DeckUIStore {
  /** ID of the deck currently being viewed (null = show deck list) */
  activeDeckId: string | null;
  setActiveDeck: (id: string) => void;
  clearActiveDeck: () => void;

  /** State for the "Add to Deck" modal */
  isAddToDeckOpen: boolean;
  addToDeckTargetEntryId: string | null;
  openAddToDeck: (collectionEntryId: string) => void;
  closeAddToDeck: () => void;
}

export const useDeckStore = create<DeckUIStore>((set) => ({
  activeDeckId: null,
  setActiveDeck: (id) => set({ activeDeckId: id }),
  clearActiveDeck: () => set({ activeDeckId: null }),

  isAddToDeckOpen: false,
  addToDeckTargetEntryId: null,
  openAddToDeck: (collectionEntryId) =>
    set({ isAddToDeckOpen: true, addToDeckTargetEntryId: collectionEntryId }),
  closeAddToDeck: () =>
    set({ isAddToDeckOpen: false, addToDeckTargetEntryId: null }),
}));
