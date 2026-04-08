import { useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GameType } from '../types';
import { db, DbEntry } from '../services/db';
import { useCollectionStore, SortBy } from '../store/collectionStore';
import CollectionCard from './CollectionCard';

interface CollectionViewProps {
  game: GameType;
}

const GAME_LABEL: Record<GameType, string> = {
  yugioh: 'Yu-Gi-Oh!',
  mtg: 'Magic the Gathering',
  pokemon: 'Pokémon',
};

const ACCENT: Record<GameType, string> = {
  yugioh: 'text-amber-400',
  mtg: 'text-red-400',
  pokemon: 'text-blue-400',
};

const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: 'Date Added', value: 'addedAt' },
  { label: 'Name', value: 'name' },
  { label: 'Quantity', value: 'quantity' },
];

export default function CollectionView({ game }: CollectionViewProps) {
  const searchTerm = useCollectionStore((s) => s.searchTerm);
  const sortBy = useCollectionStore((s) => s.sortBy);
  const sortDir = useCollectionStore((s) => s.sortDir);
  const filterType = useCollectionStore((s) => s.filterType);
  const filterSet = useCollectionStore((s) => s.filterSet);
  const filterRarity = useCollectionStore((s) => s.filterRarity);
  const setSearchTerm = useCollectionStore((s) => s.setSearchTerm);
  const setSortBy = useCollectionStore((s) => s.setSortBy);
  const setSortDir = useCollectionStore((s) => s.setSortDir);
  const setFilterType = useCollectionStore((s) => s.setFilterType);
  const setFilterSet = useCollectionStore((s) => s.setFilterSet);
  const setFilterRarity = useCollectionStore((s) => s.setFilterRarity);
  const resetFilters = useCollectionStore((s) => s.resetFilters);

  // Fetch all entries for this game from Dexie — reactive to any DB changes
  const allEntries = useLiveQuery(
    () => db.collection.where('game').equals(game).toArray() as Promise<DbEntry[]>,
    [game]
  );

  // Derive option lists for filter dropdowns from actual collection data
  const base = (allEntries ?? []) as DbEntry[];
  const typeOptions = useMemo(
    () => [...new Set(base.map((e) => e.type).filter((t): t is string => !!t))].sort(),
    [allEntries]
  );
  const setOptions = useMemo(
    () => [...new Set(base.map((e) => e.set).filter((s): s is string => !!s))].sort(),
    [allEntries]
  );
  const rarityOptions = useMemo(
    () => [...new Set(base.map((e) => e.rarity).filter((r): r is string => !!r))].sort(),
    [allEntries]
  );

  // Apply search + filters + sort in JS (per-game subsets are small enough)
  const entries = useMemo((): DbEntry[] => {
    let result: DbEntry[] = base;
    const term = searchTerm.trim().toLowerCase();
    if (term) result = result.filter((e: DbEntry) => e.name.toLowerCase().includes(term));
    if (filterType) result = result.filter((e: DbEntry) => e.type === filterType);
    if (filterSet) result = result.filter((e: DbEntry) => e.set === filterSet);
    if (filterRarity) result = result.filter((e: DbEntry) => e.rarity === filterRarity);

    result = [...result].sort((a: DbEntry, b: DbEntry) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'quantity') cmp = a.quantity - b.quantity;
      else cmp = a.addedAt.localeCompare(b.addedAt);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [allEntries, searchTerm, filterType, filterSet, filterRarity, sortBy, sortDir]);

  const totalCards = useMemo(
    () => base.reduce((sum: number, e: DbEntry) => sum + e.quantity, 0),
    [allEntries]
  );

  // Virtual scroll
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 128, // approximate row height in px
    overscan: 5,
  });

  const hasActiveFilters = !!(searchTerm || filterType || filterSet || filterRarity);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className={`text-lg font-semibold ${ACCENT[game]}`}>
          {GAME_LABEL[game]} Collection
        </h2>
        <span className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {base.length} unique · {totalCards} total
        </span>
      </div>

      {/* Filter / Sort bar */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 min-w-36 bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-slate-400"
        >
          <option value="">All types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterSet}
          onChange={(e) => setFilterSet(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-slate-400"
        >
          <option value="">All sets</option>
          {setOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-slate-400"
        >
          <option value="">All rarities</option>
          {rarityOptions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split('-') as [SortBy, 'asc' | 'desc'];
            setSortBy(field);
            setSortDir(dir);
          }}
          className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-slate-400"
        >
          {SORT_OPTIONS.map(({ label, value }) => (
            <>
              <option key={`${value}-desc`} value={`${value}-desc`}>{label} ↓</option>
              <option key={`${value}-asc`} value={`${value}-asc`}>{label} ↑</option>
            </>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {entries.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-4">📭</p>
          {hasActiveFilters ? (
            <>
              <p className="text-lg font-medium text-slate-400">No matching cards</p>
              <p className="text-sm mt-1">Try adjusting your filters.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-slate-400">No cards yet</p>
              <p className="text-sm mt-1">
                Search for {GAME_LABEL[game]} cards and add them to your collection.
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
          <div
            style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
          >
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
                  <CollectionCard entry={entry} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
