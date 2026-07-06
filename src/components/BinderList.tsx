import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { createBinder, deleteBinder } from '../services/binderDb';
import { exportBinderToCsv } from '../services/exportBinder';
import { useBinderStore } from '../store/binderStore';
import BinderView from './BinderView';

const GAME_LABEL: Record<string, string> = {
  yugioh: 'Yu-Gi-Oh!',
  mtg: 'MTG',
  pokemon: 'Pokémon',
};

const GAME_CHIP: Record<string, string> = {
  yugioh: 'bg-amber-900/50 text-amber-300',
  mtg: 'bg-red-900/50 text-red-300',
  pokemon: 'bg-blue-900/50 text-blue-300',
};

export default function BinderList() {
  const activeBinderId = useBinderStore((s) => s.activeBinderId);
  const setActiveBinder = useBinderStore((s) => s.setActiveBinder);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [exportErrors, setExportErrors] = useState<Record<string, string>>({});

  const binders = useLiveQuery(() => db.binders.orderBy('createdAt').reverse().toArray(), []);

  // Per-binder entry counts and game breakdown
  const binderEntries = useLiveQuery(() => db.binder_entries.toArray(), []);
  const collectionCards = useLiveQuery(() => db.collection.toArray(), []);

  // Drill into a binder
  if (activeBinderId) {
    return <BinderView />;
  }

  const getBinderStats = (binderId: string) => {
    const entries = (binderEntries ?? []).filter((e) => e.binderId === binderId);
    const cardMap = new Map((collectionCards ?? []).map((c) => [c.id, c]));
    const gameCounts: Record<string, number> = {};
    for (const e of entries) {
      const card = cardMap.get(e.collectionEntryId);
      if (card) {
        gameCounts[card.game] = (gameCounts[card.game] ?? 0) + 1;
      }
    }
    return { count: entries.length, gameCounts };
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setFormError('Binder name is required.');
      return;
    }
    try {
      setFormError(null);
      await createBinder(name, newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
      setShowNewForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create binder.');
    }
  };

  const handleDelete = async (binderId: string, name: string) => {
    if (!confirm(`Delete binder "${name}"? This cannot be undone.`)) return;
    await deleteBinder(binderId);
  };

  const handleExport = async (binderId: string) => {
    try {
      setExportErrors((prev) => ({ ...prev, [binderId]: '' }));
      await exportBinderToCsv(binderId);
    } catch (err) {
      setExportErrors((prev) => ({
        ...prev,
        [binderId]: err instanceof Error ? err.message : 'Export failed.',
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">My Binders</h2>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors duration-150"
        >
          + New Binder
        </button>
      </div>

      {/* New binder form */}
      {showNewForm && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Create Binder</h3>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Binder name (e.g. eBay Batch July)"
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowNewForm(false); setNewName(''); setNewDesc(''); setFormError(null); }}
              className="px-3 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreate()}
              disabled={!newName.trim()}
              className="px-3 py-1.5 text-sm rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Binder cards */}
      {(binders ?? []).length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-4">📂</p>
          <p className="text-lg font-medium text-slate-400">No binders yet</p>
          <p className="text-sm mt-1">
            Create a binder, then add cards from your collection to it.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {(binders ?? []).map((binder) => {
            const { count, gameCounts } = getBinderStats(binder.id);
            return (
              <div
                key={binder.id}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 text-sm truncate">{binder.name}</p>
                    {binder.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{binder.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(binder.id, binder.name)}
                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 text-lg leading-none"
                    title="Delete binder"
                  >
                    ×
                  </button>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">
                    {count} {count === 1 ? 'card' : 'cards'}
                  </span>
                  {Object.entries(gameCounts).map(([game, n]) => (
                    <span
                      key={game}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${GAME_CHIP[game] ?? 'bg-slate-700 text-slate-300'}`}
                    >
                      {n} {GAME_LABEL[game] ?? game}
                    </span>
                  ))}
                </div>

                {exportErrors[binder.id] && (
                  <p className="text-xs text-red-400">{exportErrors[binder.id]}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveBinder(binder.id)}
                    className="flex-1 py-1.5 text-xs font-medium rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleExport(binder.id)}
                    className="flex-1 py-1.5 text-xs font-medium rounded-md bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors"
                  >
                    ⬇ Export CSV
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
