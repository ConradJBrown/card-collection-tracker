import { CollectionEntry } from '../types';
import { useCollectionStore } from '../store/collectionStore';

interface CollectionCardProps {
  entry: CollectionEntry;
}

const CONDITIONS: CollectionEntry['condition'][] = [
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
  const incrementQty = useCollectionStore((s) => s.incrementQty);
  const decrementQty = useCollectionStore((s) => s.decrementQty);
  const removeCard = useCollectionStore((s) => s.removeCard);
  const setCondition = useCollectionStore((s) => s.setCondition);

  const key = `${entry.card.game}-${entry.card.id}`;
  const accent = GAME_ACCENT[entry.card.game] ?? 'border-slate-600';

  return (
    <div className={`bg-slate-800 rounded-lg shadow-md overflow-hidden flex gap-4 p-4 border-l-4 ${accent}`}>
      <div className="flex-shrink-0 w-20 h-28 bg-slate-700 rounded-md overflow-hidden">
        {entry.card.imageUrl ? (
          <img
            src={entry.card.imageUrl}
            alt={entry.card.name}
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
          <p className="font-semibold text-slate-100 leading-tight text-sm">{entry.card.name}</p>
          <button
            onClick={() => removeCard(key)}
            className="text-slate-500 hover:text-red-400 transition-colors duration-150 flex-shrink-0 text-lg leading-none"
            title="Remove from collection"
          >
            ×
          </button>
        </div>

        {entry.card.type && (
          <p className="text-xs text-slate-400 truncate">{entry.card.type}</p>
        )}

        <div className="flex items-center gap-3 flex-wrap mt-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => decrementQty(key)}
              className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-base flex items-center justify-center transition-colors duration-150"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-slate-100">
              {entry.quantity}
            </span>
            <button
              onClick={() => incrementQty(key)}
              className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-base flex items-center justify-center transition-colors duration-150"
            >
              +
            </button>
          </div>

          <select
            value={entry.condition}
            onChange={(e) => setCondition(key, e.target.value as CollectionEntry['condition'])}
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
