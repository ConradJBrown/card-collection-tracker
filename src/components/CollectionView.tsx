import { GameType } from '../types';
import { useCollectionStore } from '../store/collectionStore';
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

export default function CollectionView({ game }: CollectionViewProps) {
  const getByGame = useCollectionStore((s) => s.getByGame);
  const entries = getByGame(game);

  const totalCards = entries.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h2 className={`text-lg font-semibold ${ACCENT[game]}`}>
          {GAME_LABEL[game]} Collection
        </h2>
        <span className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {entries.length} unique · {totalCards} total
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg font-medium text-slate-400">No cards yet</p>
          <p className="text-sm mt-1">
            Search for {GAME_LABEL[game]} cards and add them to your collection.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <CollectionCard key={`${entry.card.game}-${entry.card.id}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
