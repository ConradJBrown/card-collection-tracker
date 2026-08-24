import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { DeckEntryWithCard, listDeckEntries, removeCardFromDeck, updateDeckEntryQuantity } from '../services/deckDb';
import { useDeckStore } from '../store/deckStore';

const GAME_ACCENT: Record<string, string> = {
  yugioh: 'text-amber-400',
  mtg: 'text-red-400',
  pokemon: 'text-blue-400',
};

export default function DeckView() {
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const clearActiveDeck = useDeckStore((s) => s.clearActiveDeck);

  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const deck = useLiveQuery(
    () => (activeDeckId ? db.decks.get(activeDeckId) : undefined),
    [activeDeckId]
  );

  const rawEntries = useLiveQuery(
    () => (activeDeckId ? listDeckEntries(activeDeckId) : Promise.resolve([])),
    [activeDeckId]
  ) as DeckEntryWithCard[] | undefined;

  const entries = useMemo((): DeckEntryWithCard[] => {
    const base = rawEntries ?? [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return base;
    return base.filter((e) => e.card?.name.toLowerCase().includes(term));
  }, [rawEntries, searchTerm]);

  const totalCards = useMemo(
    () => (rawEntries ?? []).reduce((sum, e) => sum + e.quantity, 0),
    [rawEntries]
  );

  const handleRemove = async (entryId: string) => {
    try {
      setError(null);
      await removeCardFromDeck(entryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove card.');
    }
  };

  const handleQtyChange = async (entryId: string, newQty: number) => {
    try {
      setError(null);
      if (newQty < 1) {
        await removeCardFromDeck(entryId);
      } else {
        await updateDeckEntryQuantity(entryId, newQty);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity.');
    }
  };

  if (!activeDeckId || !deck) return null;

  const accent = GAME_ACCENT[deck.game] ?? 'text-slate-100';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={clearActiveDeck}
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          ← Back
        </button>
        <h2 className={`text-lg font-semibold flex-1 truncate ${accent}`}>{deck.name}</h2>
        <span className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {(rawEntries ?? []).length} unique · {totalCards} total
        </span>
      </div>

      {deck.description && (
        <p className="text-sm text-slate-400">{deck.description}</p>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Search */}
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by card name…"
        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
      />

      {/* Cards */}
      {entries.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-4">🃏</p>
          {searchTerm ? (
            <p className="text-lg font-medium text-slate-400">No matching cards</p>
          ) : (
            <>
              <p className="text-lg font-medium text-slate-400">Deck is empty</p>
              <p className="text-sm mt-1">
                Go to My Collection and use the 🃏 button to add cards here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-slate-800 rounded-lg flex gap-3 p-3 border border-slate-700 items-center"
            >
              {entry.card?.imageUrl && (
                <div className="flex-shrink-0 w-12 h-16 bg-slate-700 rounded overflow-hidden">
                  <img
                    src={entry.card.imageUrl}
                    alt={entry.card.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {entry.card?.name ?? entry.collectionEntryId}
                </p>
                {entry.card?.type && (
                  <p className="text-xs text-slate-400 truncate">{entry.card.type}</p>
                )}
                {entry.card?.set && (
                  <p className="text-xs text-slate-500 truncate">
                    {entry.card.set}{entry.card.rarity ? ` · ${entry.card.rarity}` : ''}
                  </p>
                )}
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { void handleQtyChange(entry.id, entry.quantity - 1); }}
                  className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-base flex items-center justify-center transition-colors"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-slate-100">
                  {entry.quantity}
                </span>
                <button
                  onClick={() => { void handleQtyChange(entry.id, entry.quantity + 1); }}
                  disabled={(entry.card?.quantity ?? 0) <= entry.quantity}
                  className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 font-bold text-base flex items-center justify-center transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => { void handleRemove(entry.id); }}
                className="text-slate-500 hover:text-red-400 transition-colors text-xl leading-none flex-shrink-0"
                title="Remove from deck"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
