import { DbEntry, removeCard, incrementQty, decrementQty, setCondition } from '../services/db';

interface CollectionCardProps {
  entry: DbEntry;
}

const CONDITIONS: DbEntry['condition'][] = [
  'Mint',
  'Near Mint',
  'Lightly Played',
  'Moderately Played',
  'Heavily Played',
  'Damaged',
];

const GAME_ACCENT: Record<string, string> = {
  yugioh: 'border-amber-500',
  mtg: 'border-red-500',
  pokemon: 'border-blue-500',
};

export default function CollectionCard({ entry }: CollectionCardProps) {
  const accent = GAME_ACCENT[entry.game] ?? 'border-slate-600';

  return (
    <div className={`bg-slate-800 rounded-lg shadow-md overflow-hidden flex gap-4 p-4 border-l-4 ${accent}`}>
      <div className="flex-shrink-0 w-20 h-28 bg-slate-700 rounded-md overflow-hidden">
        {entry.imageUrl ? (
          <img
            src={entry.imageUrl}
            alt={entry.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            No Image
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-slate-100 leading-tight text-sm">{entry.name}</p>
          <button
            onClick={() => removeCard(entry.id)}
            className="text-slate-500 hover:text-red-400 transition-colors duration-150 flex-shrink-0 text-lg leading-none"
            title="Remove from collection"
          >
            ×
          </button>
        </div>

        {entry.type && (
          <p className="text-xs text-slate-400 truncate">{entry.type}</p>
        )}
        {entry.set && (
          <p className="text-xs text-slate-500 truncate">{entry.set}{entry.rarity ? ` · ${entry.rarity}` : ''}</p>
        )}

        <div className="flex items-center gap-3 flex-wrap mt-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => decrementQty(entry.id)}
              className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-base flex items-center justify-center transition-colors duration-150"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-slate-100">
              {entry.quantity}
            </span>
            <button
              onClick={() => incrementQty(entry.id)}
              className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-base flex items-center justify-center transition-colors duration-150"
            >
              +
            </button>
          </div>

          <select
            value={entry.condition}
            onChange={(e) => setCondition(entry.id, e.target.value as DbEntry['condition'])}
            className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-slate-500">
          Added {new Date(entry.addedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
