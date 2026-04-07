import { ReactNode } from 'react';
import { GameType } from '../types';

interface LayoutProps {
  activeGame: GameType;
  onGameChange: (game: GameType) => void;
  children: ReactNode;
}

const GAMES: { id: GameType; label: string; color: string }[] = [
  { id: 'yugioh', label: 'Yu-Gi-Oh!', color: 'text-amber-400 border-amber-400' },
  { id: 'mtg', label: 'MTG', color: 'text-red-400 border-red-400' },
  { id: 'pokemon', label: 'Pokémon', color: 'text-blue-400 border-blue-400' },
];

export default function Layout({ activeGame, onGameChange, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="bg-slate-950 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <span className="text-xl font-bold tracking-tight text-slate-100">
              🃏 Card Collection Tracker
            </span>
            <div className="flex gap-1">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onGameChange(g.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border-b-2 transition-all duration-150 ${
                    activeGame === g.id
                      ? `${g.color} bg-slate-800`
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
