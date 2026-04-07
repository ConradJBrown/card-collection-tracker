import { CardResult } from '../types';

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
}

interface ScryfallResponse {
  data: ScryfallCard[];
}

export async function searchMtg(name: string): Promise<CardResult[]> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(name)}`
    );
    if (!res.ok) return [];
    const json: ScryfallResponse = await res.json();
    return json.data.map((card) => ({
      id: card.id,
      name: card.name,
      imageUrl:
        card.image_uris?.normal ??
        card.card_faces?.[0]?.image_uris?.normal ??
        '',
      game: 'mtg',
      type: card.type_line,
      description: card.oracle_text,
    }));
  } catch {
    return [];
  }
}
