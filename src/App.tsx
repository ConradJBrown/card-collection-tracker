import { useState, useEffect } from 'react';
import { GameType } from './types';
import Layout from './components/Layout';
import CardSearch from './components/CardSearch';
import CollectionView from './components/CollectionView';
import { db } from './services/db';
import localforage from 'localforage';
import type { CollectionEntry } from './types';

type ActiveTab = 'search' | 'collection';

const TAB_STYLES: Record<GameType, { active: string; inactive: string }> = {
  yugioh: {
    active: 'border-amber-400 text-amber-400',
    inactive: 'border-transparent text-slate-400 hover:text-amber-300',
  },
  mtg: {
    active: 'border-red-400 text-red-400',
    inactive: 'border-transparent text-slate-400 hover:text-red-300',
  },
  pokemon: {
    active: 'border-blue-400 text-blue-400',
    inactive: 'border-transparent text-slate-400 hover:text-blue-300',
  },
};

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>('yugioh');
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');

  // One-time migration: move old localforage blob to Dexie
  useEffect(() => {
    const migrate = async () => {
      const old = await localforage.getItem<Record<string, CollectionEntry>>('collection');
      if (!old) return;
      const rows = Object.entries(old).map(([id, entry]) => ({
        id,
        cardId: entry.card.id,
        game: entry.card.game,
        name: entry.card.name,
        imageUrl: entry.card.imageUrl,
        type: entry.card.type,
        set: entry.card.set,
        rarity: entry.card.rarity,
        description: entry.card.description,
        quantity: entry.quantity,
        condition: entry.condition,
        addedAt: entry.addedAt,
      }));
      await db.collection.bulkPut(rows);
      await localforage.removeItem('collection');
    };
    migrate();
  }, []);

  const tabs = TAB_STYLES[activeGame];

  return (
    <Layout activeGame={activeGame} onGameChange={(g) => { setActiveGame(g); setActiveTab('search'); }}>
      <div className="mb-6 border-b border-slate-700">
        <nav className="flex gap-6">
          {(['search', 'collection'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors duration-150 capitalize ${
                activeTab === tab ? tabs.active : tabs.inactive
              }`}
            >
              {tab === 'search' ? 'Search' : 'My Collection'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'search' ? (
        <CardSearch key={activeGame} game={activeGame} />
      ) : (
        <CollectionView key={activeGame} game={activeGame} />
      )}
    </Layout>
  );
}
