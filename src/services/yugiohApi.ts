import { CardResult } from '../types';
import { estimateMarketPrice } from './priceUtils';

interface YgoCard {
  id: number;
  name: string;
  type: string;
  desc: string;
  card_images: { image_url: string }[];
  card_sets?: {
    set_name: string;
    set_code?: string;
    set_rarity?: string;
  }[];
  card_prices?: {
    cardmarket_price?: string;
    tcgplayer_price?: string;
    ebay_price?: string;
    amazon_price?: string;
    coolstuffinc_price?: string;
  }[];
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

    return json.data.flatMap((card) => {
      const sets = card.card_sets ?? [];

      if (sets.length === 0) {
        return [
          {
            id: String(card.id),
            name: card.name,
            imageUrl: card.card_images[0]?.image_url ?? '',
            game: 'yugioh',
            type: card.type,
            description: card.desc,
            estimatedPrice: estimateMarketPrice([
              card.card_prices?.[0]?.cardmarket_price,
              card.card_prices?.[0]?.tcgplayer_price,
              card.card_prices?.[0]?.ebay_price,
              card.card_prices?.[0]?.amazon_price,
              card.card_prices?.[0]?.coolstuffinc_price,
            ]),
          },
        ];
      }

      return sets.map((set) => ({
        id: `${card.id}-${set.set_code ?? set.set_name}`,
        name: card.name,
        imageUrl: card.card_images[0]?.image_url ?? '',
        game: 'yugioh',
        type: card.type,
        description: card.desc,
        set: set.set_name,
        rarity: set.set_rarity,
        estimatedPrice: estimateMarketPrice([
          card.card_prices?.[0]?.cardmarket_price,
          card.card_prices?.[0]?.tcgplayer_price,
          card.card_prices?.[0]?.ebay_price,
          card.card_prices?.[0]?.amazon_price,
          card.card_prices?.[0]?.coolstuffinc_price,
        ]),
      }));
    });
  } catch {
    return [];
  }
}
