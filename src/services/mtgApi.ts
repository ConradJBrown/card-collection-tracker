import { CardResult } from '../types';
import { estimateMarketPrice } from './priceUtils';

interface ScryfallImageUris {
  normal?: string;
}

interface ScryfallCard {
  id: string;
  name: string;
  image_uris?: ScryfallImageUris;
  card_faces?: { image_uris?: ScryfallImageUris }[];
  type_line?: string;
  oracle_text?: string;
  set_name?: string;
  rarity?: string;
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
  };
}

interface ScryfallResponse {
  data: ScryfallCard[];
}

export async function searchMtg(name: string): Promise<CardResult[]> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?unique=prints&q=${encodeURIComponent(name)}`
    );
    if (!res.ok) return [];
    const json: ScryfallResponse = await res.json();

    const cards: CardResult[] = json.data.map((card) => ({
      id: card.id,
      name: card.name,
      imageUrl:
        card.image_uris?.normal ??
        card.card_faces?.[0]?.image_uris?.normal ??
        '',
      game: 'mtg',
      type: card.type_line,
      description: card.oracle_text,
      set: card.set_name,
      rarity: card.rarity,
      estimatedPrice: estimateMarketPrice([
        card.prices?.usd,
        card.prices?.usd_foil,
        card.prices?.usd_etched,
      ]),
    }));
    return cards;
  } catch {
    return [];
  }
}
