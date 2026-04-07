import { CardResult } from '../types';

interface YgoCard {
  id: number;
  name: string;
  type: string;
  desc: string;
  card_images: { image_url: string }[];
}

interface YgoResponse {
  data: YgoCard[];
}

export async function searchYugioh(name: string): Promise<CardResult[]> {
  try {
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(name)}`
    );
    if (!res.ok) return [];
    const json: YgoResponse = await res.json();
    return json.data.map((card) => ({
      id: String(card.id),
      name: card.name,
      imageUrl: card.card_images[0]?.image_url ?? '',
      game: 'yugioh',
      type: card.type,
      description: card.desc,
    }));
  } catch {
    return [];
  }
}
