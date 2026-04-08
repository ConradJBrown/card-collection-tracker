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
}

export interface CollectionEntry {
  card: CardResult;
  quantity: number;
  condition: 'Mint' | 'Near Mint' | 'Lightly Played' | 'Moderately Played' | 'Heavily Played' | 'Damaged';
  addedAt: string;
}
