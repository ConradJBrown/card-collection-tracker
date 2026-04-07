import { CardResult } from '../types';
import CardTile from './CardTile';

interface CardGridProps {
  cards: CardResult[];
}

export default function CardGrid({ cards }: CardGridProps) {
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <CardTile key={`${card.game}-${card.id}`} card={card} />
      ))}
    </div>
  );
}
