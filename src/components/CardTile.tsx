import { CardResult } from '../types';
import { useCollectionStore } from '../store/collectionStore';

interface CardTileProps {
  card: CardResult;
}

const GAME_BADGE: Record<string, string> = {
  yugioh: 'bg-amber-500 text-amber-950',
  mtg: 'bg-red-500 text-red-950',
  pokemon: 'bg-blue-500 text-blue-950',
};

const GAME_LABEL: Record<string, string> = {
  yugioh: 'YGO',
  mtg: 'MTG',
  pokemon: 'PKM',
};

export default function CardTile({ card }: CardTileProps) {
  const addCard = useCollectionStore((s) => s.addCard);
  const collection = useCollectionStore((s) => s.collection);
  const key = `${card.game}-${card.id}`;
  const inCollection = Boolean(collection[key]);

  return (
    <div className="bg-slate-800 rounded-lg shadow-md overflow-hidden flex flex-col hover:ring-2 hover:ring-slate-600 transition-all duration-150">
      <div className="relative aspect-[3/4] bg-slate-700 overflow-hidden">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            loading="lazy"
            className="w-full h-full object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
            No Image
          </div>
        )}
        <span
          className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${
            GAME_BADGE[card.game] ?? 'bg-slate-600 text-slate-200'
          }`}
        >
          {GAME_LABEL[card.game] ?? card.game}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2">
          {card.name}
        </p>
        {card.type && (
          <p className="text-xs text-slate-400 truncate">{card.type}</p>
        )}
        <div className="mt-auto pt-2">
          {inCollection ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-green-400 bg-green-900/30 border border-green-700 px-2 py-1 rounded-md">
                ✓ In Collection
              </span>
              <button
                onClick={() => addCard(card)}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                +1
              </button>
            </div>
          ) : (
            <button
              onClick={() => addCard(card)}
              className="w-full text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-100 py-1.5 px-3 rounded-md transition-colors duration-150"
            >
              Add to Collection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
