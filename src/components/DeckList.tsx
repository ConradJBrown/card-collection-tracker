import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { GameType } from '../types';
import { db } from '../services/db';
import { createDeck, deleteDeck } from '../services/deckDb';
import { useDeckStore } from '../store/deckStore';
import DeckView from './DeckView';

const GAME_OPTIONS: { id: GameType; label: string }[] = [
  { id: 'yugioh', label: 'Yu-Gi-Oh!' },
  { id: 'mtg', label: 'MTG' },
  { id: 'pokemon', label: 'Pokémon' },
];

const GAME_CHIP: Record<string, string> = {
  yugioh: 'bg-amber-900/50 text-amber-300',
  mtg: 'bg-red-900/50 text-red-300',
  pokemon: 'bg-blue-900/50 text-blue-300',
};

const GAME_LABEL: Record<string, string> = {
  yugioh: 'Yu-Gi-Oh!',
  mtg: 'MTG',
  pokemon: 'Pokémon',
};

export default function DeckList() {
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const setActiveDeck = useDeckStore((s) => s.setActiveDeck);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGame, setNewGame] = useState<GameType>('yugioh');
  const [formError, setFormError] = useState<string | null>(null);

  const decks = useLiveQuery(() => db.decks.orderBy('createdAt').reverse().toArray(), []);
  const deckEntries = useLiveQuery(() => db.deck_entries.toArray(), []);

  if (activeDeckId) {
    return <DeckView />;
  }

  const getDeckStats = (deckId: string) => {
    const entries = (deckEntries ?? []).filter((e) => e.deckId === deckId);
    const totalCards = entries.reduce((sum, e) => sum + e.quantity, 0);
    return { unique: entries.length, total: totalCards };
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setFormError('Deck name is required.');
      return;
    }
    try {
      setFormError(null);
      await createDeck(name, newGame, newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
      setShowNewForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create deck.');
    }
  };

  const handleDelete = async (deckId: string, name: string) => {
    if (!confirm(`Delete deck "${name}"? This cannot be undone.`)) return;
    await deleteDeck(deckId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">My Decks</h2>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors duration-150"
        >
          + New Deck
        </button>
      </div>

      {/* New deck form */}
      {showNewForm && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Create Deck</h3>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { void handleCreate(); } }}
            placeholder="Deck name (e.g. Combo Aggro)"
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
          />
          <div className="flex gap-2 flex-wrap">
            {GAME_OPTIONS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setNewGame(g.id)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  newGame === g.id
                    ? 'bg-violet-700 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowNewForm(false); setNewName(''); setNewDesc(''); setFormError(null); }}
              className="px-3 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleCreate(); }}
              disabled={!newName.trim()}
              className="px-3 py-1.5 text-sm rounded-md bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Deck cards */}
      {(decks ?? []).length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-4">🃏</p>
          <p className="text-lg font-medium text-slate-400">No decks yet</p>
          <p className="text-sm mt-1">
            Create a deck, then add cards from your collection to it.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {(decks ?? []).map((deck) => {
            const { unique, total } = getDeckStats(deck.id);
            return (
              <div
                key={deck.id}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 text-sm truncate">{deck.name}</p>
                    {deck.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{deck.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { void handleDelete(deck.id, deck.name); }}
                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 text-lg leading-none"
                    title="Delete deck"
                  >
                    ×
                  </button>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${GAME_CHIP[deck.game] ?? 'bg-slate-700 text-slate-300'}`}
                  >
                    {GAME_LABEL[deck.game] ?? deck.game}
                  </span>
                  <span className="text-xs text-slate-400">
                    {unique} unique · {total} total
                  </span>
                </div>

                {/* Actions */}
                <button
                  onClick={() => setActiveDeck(deck.id)}
                  className="w-full py-1.5 text-xs font-medium rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                >
                  View / Edit
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
