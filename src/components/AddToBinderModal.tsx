import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { addCardToBinder, createBinder } from '../services/binderDb';
import { useBinderStore } from '../store/binderStore';

export default function AddToBinderModal() {
  const isOpen = useBinderStore((s) => s.isAddToBinderOpen);
  const targetEntryId = useBinderStore((s) => s.addToBinderTargetEntryId);
  const closeAddToBinder = useBinderStore((s) => s.closeAddToBinder);

  const [newBinderName, setNewBinderName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const binders = useLiveQuery(() => db.binders.orderBy('createdAt').reverse().toArray(), []);

  if (!isOpen || !targetEntryId) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAddToBinder = async (binderId: string) => {
    try {
      setError(null);
      await addCardToBinder(binderId, targetEntryId, 1);
      showToast('Added to binder!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to binder.');
    }
  };

  const handleCreateAndAdd = async () => {
    const name = newBinderName.trim();
    if (!name) return;
    try {
      setError(null);
      const binder = await createBinder(name);
      await addCardToBinder(binder.id, targetEntryId, 1);
      setNewBinderName('');
      setCreatingNew(false);
      showToast(`Added to new binder "${binder.name}"!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create binder.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) closeAddToBinder(); }}
    >
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-sm p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">Add to Binder</h3>
          <button
            onClick={closeAddToBinder}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {toast && (
          <div className="bg-emerald-800 text-emerald-100 text-sm rounded-md px-3 py-2 text-center">
            {toast}
          </div>
        )}
        {error && (
          <p className="text-red-400 text-xs">{error}</p>
        )}

        {/* Binder list */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {(binders ?? []).length === 0 && !creatingNew && (
            <p className="text-sm text-slate-400 text-center py-4">
              No binders yet. Create one below.
            </p>
          )}
          {(binders ?? []).map((binder) => (
            <button
              key={binder.id}
              onClick={() => void handleAddToBinder(binder.id)}
              className="text-left px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <p className="text-sm font-medium text-slate-100">{binder.name}</p>
              {binder.description && (
                <p className="text-xs text-slate-400 truncate">{binder.description}</p>
              )}
            </button>
          ))}
        </div>

        {/* Create new binder */}
        {creatingNew ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newBinderName}
              onChange={(e) => setNewBinderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateAndAdd(); }}
              placeholder="Binder name…"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
            />
            <button
              onClick={() => void handleCreateAndAdd()}
              disabled={!newBinderName.trim()}
              className="px-3 py-1.5 text-sm rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => { setCreatingNew(false); setNewBinderName(''); }}
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
            + New Binder
          </button>
        )}
      </div>
    </div>
  );
}
