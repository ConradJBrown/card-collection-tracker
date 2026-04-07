import { CardResult } from '../types';

interface PokemonCard {
  id: string;
  name: string;
  images?: { large?: string; small?: string };
  supertype?: string;
  flavorText?: string;
}

interface PokemonResponse {
  data: PokemonCard[];
}

export async function searchPokemon(name: string): Promise<CardResult[]> {
  try {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(name)}`
    );
    if (!res.ok) return [];
    const json: PokemonResponse = await res.json();
    return json.data.map((card) => ({
      id: card.id,
      name: card.name,
      imageUrl: card.images?.large ?? card.images?.small ?? '',
      game: 'pokemon',
      type: card.supertype,
      description: card.flavorText ?? '',
    }));
  } catch {
    return [];
  }
}
