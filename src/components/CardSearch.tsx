import { useEffect, useState, FormEvent } from 'react';
import { GameType, CardResult } from '../types';
import { searchYugioh } from '../services/yugiohApi';
import { searchMtg } from '../services/mtgApi';
import { searchPokemon } from '../services/pokemonApi';
import { mtgDatabase } from '../services/mtgDatabase';
import CardGrid from './CardGrid';

interface CardSearchProps {
  game: GameType;
}

const PLACEHOLDERS: Record<GameType, string> = {
  yugioh: 'Search Yu-Gi-Oh! cards, e.g. "Dark Magician"',
  mtg: 'Search Magic cards, e.g. "Lightning Bolt"',
  pokemon: 'Search Pokemon cards, e.g. "Pikachu"',
};

const BUTTON_COLORS: Record<GameType, string> = {
  yugioh: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
  mtg: 'bg-red-500 hover:bg-red-400 text-white',
  pokemon: 'bg-blue-500 hover:bg-blue-400 text-white',
};

interface DbProgress {
  loaded: number;
  total: number;
  status: string;
}

export default function CardSearch({ game }: CardSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [dbDownloading, setDbDownloading] = useState(false);
  const [dbProgress, setDbProgress] = useState<DbProgress | null>(null);
  const [dbMetadata, setDbMetadata] = useState<{ lastUpdated: string; cardCount: number } | null>(null);

  useEffect(() => {
    const initDb = async () => {
      if (game !== 'mtg') {
        return;
      }

      try {
        await mtgDatabase.init();
        const metadata = await mtgDatabase.getMetadata();
        if (metadata) {
          setDbMetadata({
            lastUpdated: new Date(metadata.lastUpdated).toLocaleDateString(),
            cardCount: metadata.cardCount,
          });
        }
      } catch {
        // Ignore metadata read failures; search still works via API.
      }
    };

    initDb();
  }, [game]);

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

      if (game === 'yugioh') {
        cards = await searchYugioh(trimmed);
      } else if (game === 'mtg') {
        const localCards = await mtgDatabase.searchLocal(trimmed);
        cards = localCards.length > 0 ? localCards : await searchMtg(trimmed);
      } else if (game === 'pokemon') {
        cards = await searchPokemon(trimmed);
      }

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

  const handleDownloadDatabase = async () => {
    try {
      setDbDownloading(true);
      setDbProgress({ loaded: 0, total: 100, status: 'Starting download...' });
      setError(null);

      await mtgDatabase.downloadAndIndex((progress) => {
        setDbProgress(progress);
      });

      const metadata = await mtgDatabase.getMetadata();
      if (metadata) {
        setDbMetadata({
          lastUpdated: new Date(metadata.lastUpdated).toLocaleDateString(),
          cardCount: metadata.cardCount,
        });
      }

      setDbProgress(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Database update failed: ${message}`);
      setDbProgress(null);
    } finally {
      setDbDownloading(false);
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
          {loading ? 'Searching...' : 'Search'}
        </button>
        {game === 'mtg' && (
          <button
            type="button"
            onClick={handleDownloadDatabase}
            disabled={dbDownloading}
            className="px-4 py-2.5 rounded-lg font-medium text-sm bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            title="Download MTG card database for offline search"
          >
            {dbDownloading ? 'Updating DB...' : 'Update DB'}
          </button>
        )}
      </form>

      {dbProgress && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
          <p className="text-sm text-slate-300 font-medium">{dbProgress.status}</p>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-slate-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${dbProgress.total > 0 ? (dbProgress.loaded / dbProgress.total) * 100 : 0}%` }}
            />
          </div>
          {dbProgress.total > 0 && (
            <p className="text-xs text-slate-500">
              {(dbProgress.loaded / 1024 / 1024).toFixed(1)} MB / {(dbProgress.total / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
        </div>
      )}

      {dbMetadata && !dbDownloading && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
          Local database available: {dbMetadata.cardCount.toLocaleString()} cards (updated {dbMetadata.lastUpdated})
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">Search error</p>
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
          <p className="text-4xl mb-3">Search</p>
          <p>Search for cards to add them to your collection.</p>
        </div>
      )}
    </div>
  );
}
