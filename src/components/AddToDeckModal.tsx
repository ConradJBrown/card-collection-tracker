import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { GameType } from '../types';
import { db } from '../services/db';
import { addCardToDeck, createDeck } from '../services/deckDb';
import { useDeckStore } from '../store/deckStore';

export default function AddToDeckModal() {
  const isOpen = useDeckStore((s) => s.isAddToDeckOpen);
  const targetEntryId = useDeckStore((s) => s.addToDeckTargetEntryId);
  const closeAddToDeck = useDeckStore((s) => s.closeAddToDeck);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [newDeckName, setNewDeckName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addQty, setAddQty] = useState(1);

  const decks = useLiveQuery(() => db.decks.orderBy('createdAt').reverse().toArray(), []);
  const collectionEntry = useLiveQuery(
    () => (targetEntryId ? db.collection.get(targetEntryId) : undefined),
    [targetEntryId]
  );
  const maxQty = collectionEntry?.quantity ?? 1;
  const cardGame = (collectionEntry?.game ?? 'yugioh') as GameType;

  const filteredDecks = (decks ?? []).filter((d) => d.game === cardGame);

  useEffect(() => {
    if (!isOpen) return;

    setAddQty(1);
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAddToDeck();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAddToDeck, isOpen]);

  if (!isOpen || !targetEntryId) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAddToDeck = async (deckId: string) => {
    try {
      setError(null);
      await addCardToDeck(deckId, targetEntryId, addQty);
      showToast('Added to deck!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to deck.');
    }
  };

  const handleCreateAndAdd = async () => {
    const name = newDeckName.trim();
    if (!name) return;
    try {
      setError(null);
      const deck = await createDeck(name, cardGame);
      await addCardToDeck(deck.id, targetEntryId, addQty);
      setNewDeckName('');
      setCreatingNew(false);
      showToast(`Added to new deck "${deck.name}"!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deck.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) closeAddToDeck(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-deck-title"
        aria-describedby="add-to-deck-description"
        tabIndex={-1}
        className="bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-sm p-5 flex flex-col gap-4 outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id="add-to-deck-title" className="text-base font-semibold text-slate-100">
            Add to Deck
          </h3>
          <button
            onClick={closeAddToDeck}
            aria-label="Close add to deck dialog"
            className="text-slate-400 hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <p id="add-to-deck-description" className="text-sm text-slate-400">
          Choose a deck or create a new one for this card.
        </p>

        {/* Quantity selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="deck-add-qty" className="text-sm text-slate-300 flex-shrink-0">
            Quantity:
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAddQty((q) => Math.max(1, q - 1))}
              disabled={addQty <= 1}
              className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 font-bold text-base flex items-center justify-center transition-colors"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              id="deck-add-qty"
              type="number"
              min={1}
              max={maxQty}
              value={addQty}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setAddQty(Math.min(maxQty, Math.max(1, v)));
              }}
              className="w-12 text-center bg-slate-700 border border-slate-600 rounded-md py-1 text-sm text-slate-100 focus:outline-none focus:border-slate-400"
            />
            <button
              onClick={() => setAddQty((q) => Math.min(maxQty, q + 1))}
              disabled={addQty >= maxQty}
              className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 font-bold text-base flex items-center justify-center transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <span className="text-xs text-slate-500">/ {maxQty}</span>
        </div>

        {toast && (
          <div className="bg-emerald-800 text-emerald-100 text-sm rounded-md px-3 py-2 text-center">
            {toast}
          </div>
        )}
        {error && (
          <p className="text-red-400 text-xs">{error}</p>
        )}

        {/* Deck list */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto" aria-label="Available decks">
          {filteredDecks.length === 0 && !creatingNew && (
            <p className="text-sm text-slate-400 text-center py-4">
              No decks yet for this game. Create one below.
            </p>
          )}
          {filteredDecks.map((deck) => (
            <button
              key={deck.id}
              onClick={() => handleAddToDeck(deck.id)}
              className="text-left px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <p className="text-sm font-medium text-slate-100">{deck.name}</p>
              {deck.description && (
                <p className="text-xs text-slate-400 truncate">{deck.description}</p>
              )}
            </button>
          ))}
        </div>

        {/* Create new deck */}
        {creatingNew ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { void handleCreateAndAdd(); } }}
              placeholder="Deck name…"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
            />
            <button
              onClick={() => { void handleCreateAndAdd(); }}
              disabled={!newDeckName.trim()}
              className="px-3 py-1.5 text-sm rounded-md bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => { setCreatingNew(false); setNewDeckName(''); }}
              className="px-3 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingNew(true)}
            className="w-full py-2 text-sm rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors"
          >
            + New Deck
          </button>
        )}
      </div>
    </div>
  );
}
