export type GameType = 'yugioh' | 'mtg' | 'pokemon';

export interface CardResult {
  id: string;
  name: string;
  imageUrl: string;
  game: GameType;
  type?: string;
  set?: string;
  rarity?: string;
  description?: string;
  priceLow?: number;
  priceMid?: number;
  priceHigh?: number;
  estimatedPrice?: number;
}

export interface CollectionEntry {
  card: CardResult;
  quantity: number;
  condition: 'Mint' | 'Near Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played' | 'Damaged';
  addedAt: string;
}

export interface Binder {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BinderEntry {
  id: string;
  binderId: string;
  /** References a DbEntry.id in the collection */
  collectionEntryId: string;
  /** How many copies to list for sale (≥ 1, ≤ collection qty) */
  sellQty: number;
  askingPrice?: number;
  notes?: string;
  addedAt: string;
}
