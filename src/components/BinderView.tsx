import { useRef, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useVirtualizer } from '@tanstack/react-virtual';
import { db } from '../services/db';
import { BinderEntryWithCard, listBinderEntries } from '../services/binderDb';
import { exportBinderToCsv } from '../services/exportBinder';
import { useBinderStore } from '../store/binderStore';
import BinderCard from './BinderCard';

export default function BinderView() {
  const activeBinderId = useBinderStore((s) => s.activeBinderId);
  const clearActiveBinder = useBinderStore((s) => s.clearActiveBinder);

  const [searchTerm, setSearchTerm] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const binder = useLiveQuery(
    () => (activeBinderId ? db.binders.get(activeBinderId) : undefined),
    [activeBinderId]
  );

  const rawEntries = useLiveQuery(
    () => (activeBinderId ? listBinderEntries(activeBinderId) : Promise.resolve([])),
    [activeBinderId]
  ) as BinderEntryWithCard[] | undefined;

  const entries = useMemo((): BinderEntryWithCard[] => {
    const base = rawEntries ?? [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return base;
    return base.filter((e) => e.card?.name.toLowerCase().includes(term));
  }, [rawEntries, searchTerm]);

  const totalSellQty = useMemo(
    () => (rawEntries ?? []).reduce((sum, e) => sum + e.sellQty, 0),
    [rawEntries]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 192,
    overscan: 5,
  });

  const handleExport = async () => {
    if (!activeBinderId) return;
    try {
      setExportError(null);
      await exportBinderToCsv(activeBinderId);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  if (!activeBinderId || !binder) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={clearActiveBinder}
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-slate-100 flex-1 truncate">{binder.name}</h2>
        <div className="flex items-center gap-2">
          <span className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {(rawEntries ?? []).length} cards · {totalSellQty} to sell
          </span>
          <button
            onClick={() => void handleExport()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-700 hover:bg-emerald-600 text-white transition-colors duration-150"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {binder.description && (
        <p className="text-sm text-slate-400">{binder.description}</p>
      )}

      {exportError && (
        <p className="text-xs text-red-400">{exportError}</p>
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
          <p className="text-5xl mb-4">📁</p>
          {searchTerm ? (
            <p className="text-lg font-medium text-slate-400">No matching cards</p>
          ) : (
            <>
              <p className="text-lg font-medium text-slate-400">Binder is empty</p>
              <p className="text-sm mt-1">
                Go to My Collection and use the 📁 button to add cards here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div
          ref={parentRef}
          className="overflow-y-auto"
          style={{ height: 'min(600px, 70vh)' }}
        >
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const entry = entries[virtualRow.index];
              return (
                <div
                  key={entry.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '12px',
                  }}
                >
                  <BinderCard entry={entry} card={entry.card} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
