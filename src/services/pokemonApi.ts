import { CardResult } from '../types';
import { estimateMarketPrice } from './priceUtils';

interface PokemonCard {
  id: string;
  name: string;
  images?: { large?: string; small?: string };
  supertype?: string;
  flavorText?: string;
  set?: { name?: string };
  rarity?: string;
  tcgplayer?: {
    prices?: {
      normal?: { market?: number | string | null; mid?: number | string | null; low?: number | string | null; high?: number | string | null; directLow?: number | string | null };
      holofoil?: { market?: number | string | null; mid?: number | string | null; low?: number | string | null; high?: number | string | null; directLow?: number | string | null };
      reverseHolofoil?: { market?: number | string | null; mid?: number | string | null; low?: number | string | null; high?: number | string | null; directLow?: number | string | null };
    };
  };
}

interface PokemonResponse {
  data: PokemonCard[];
}

export async function searchPokemon(name: string): Promise<CardResult[]> {
  try {
    const query = `name:${name}`;
    const res = await fetch(
      `/api/pokemon/v2/cards?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];
    const json: PokemonResponse = await res.json();

    const cards: CardResult[] = json.data.map((card) => ({
      id: card.id,
      name: card.name,
      imageUrl: card.images?.large ?? card.images?.small ?? '',
      game: 'pokemon',
      type: card.supertype,
      description: card.flavorText ?? '',
      set: card.set?.name,
      rarity: card.rarity,
      estimatedPrice: estimateMarketPrice(
        Object.values(card.tcgplayer?.prices ?? {}).flatMap((variant) => [
          variant.market,
          variant.mid,
          variant.low,
          variant.high,
          variant.directLow,
        ])
      ),
    }));
    return cards;
  } catch {
    return [];
  }
}
