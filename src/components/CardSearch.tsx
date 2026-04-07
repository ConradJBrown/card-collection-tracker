import { useState, FormEvent } from 'react';
import { GameType, CardResult } from '../types';
import { searchYugioh } from '../services/yugiohApi';
import { searchMtg } from '../services/mtgApi';
import { searchPokemon } from '../services/pokemonApi';
import CardGrid from './CardGrid';

interface CardSearchProps {
  game: GameType;
}

const PLACEHOLDERS: Record<GameType, string> = {
  yugioh: 'Search Yu-Gi-Oh! cards, e.g. "Dark Magician"',
  mtg: 'Search Magic cards, e.g. "Lightning Bolt"',
  pokemon: 'Search Pokémon cards, e.g. "Pikachu"',
};

const BUTTON_COLORS: Record<GameType, string> = {
  yugioh: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
  mtg: 'bg-red-500 hover:bg-red-400 text-white',
  pokemon: 'bg-blue-500 hover:bg-blue-400 text-white',
};

export default function CardSearch({ game }: CardSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      let cards: CardResult[] = [];
      if (game === 'yugioh') cards = await searchYugioh(trimmed);
      else if (game === 'mtg') cards = await searchMtg(trimmed);
      else if (game === 'pokemon') cards = await searchPokemon(trimmed);

      if (cards.length === 0) {
        setError('No cards found. Try a different search term.');
      } else {
        setResults(cards);
      }
    } catch {
      setError('Failed to fetch cards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={PLACEHOLDERS[game]}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_COLORS[game]}`}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">😕</p>
          <p className="mt-2">{error}</p>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div>
          <p className="text-sm text-slate-400 mb-4">{results.length} card(s) found</p>
          <CardGrid cards={results} />
        </div>
      )}

      {!loading && !searched && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🔍</p>
          <p>Search for cards to add them to your collection.</p>
        </div>
      )}
    </div>
  );
}
