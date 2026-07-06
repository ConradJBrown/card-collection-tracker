import { create } from 'zustand';

interface BinderUIStore {
  /** ID of the binder currently being viewed (null = show binder list) */
  activeBinderId: string | null;
  setActiveBinder: (id: string) => void;
  clearActiveBinder: () => void;

  /** State for the "Add to Binder" modal */
  isAddToBinderOpen: boolean;
  addToBinderTargetEntryId: string | null;
  openAddToBinder: (collectionEntryId: string) => void;
  closeAddToBinder: () => void;
}

export const useBinderStore = create<BinderUIStore>((set) => ({
  activeBinderId: null,
  setActiveBinder: (id) => set({ activeBinderId: id }),
  clearActiveBinder: () => set({ activeBinderId: null }),

  isAddToBinderOpen: false,
  addToBinderTargetEntryId: null,
  openAddToBinder: (collectionEntryId) =>
    set({ isAddToBinderOpen: true, addToBinderTargetEntryId: collectionEntryId }),
  closeAddToBinder: () =>
    set({ isAddToBinderOpen: false, addToBinderTargetEntryId: null }),
}));
