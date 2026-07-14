import { useState } from 'react';
import { BinderEntry } from '../types';
import { DbEntry } from '../services/db';
import { removeCardFromBinder, updateBinderEntry } from '../services/binderDb';
import { formatCurrencyPrice } from '../services/priceUtils';
import { usePriceDisplayStore } from '../store/priceDisplayStore';

interface BinderCardProps {
  entry: BinderEntry;
  card: DbEntry | undefined;
}

const GAME_ACCENT: Record<string, string> = {
  yugioh: 'border-amber-500',
  mtg: 'border-red-500',
  pokemon: 'border-blue-500',
};

export default function BinderCard({ entry, card }: BinderCardProps) {
  const accent = card ? (GAME_ACCENT[card.game] ?? 'border-slate-600') : 'border-slate-600';
  const currency = usePriceDisplayStore((s) => s.currency);

  const [priceInput, setPriceInput] = useState(
    entry.askingPrice !== undefined ? String(entry.askingPrice) : ''
  );
  const [notesInput, setNotesInput] = useState(entry.notes ?? '');

  const handleSellQtyDecrement = () => {
    if (entry.sellQty > 1) {
      void updateBinderEntry(entry.id, { sellQty: entry.sellQty - 1 });
    }
  };

  const handleSellQtyIncrement = () => {
    const max = card?.quantity ?? entry.sellQty;
    if (entry.sellQty < max) {
      void updateBinderEntry(entry.id, { sellQty: entry.sellQty + 1 });
    }
  };

  const handlePriceBlur = () => {
    const val = parseFloat(priceInput);
    if (priceInput === '') {
      void updateBinderEntry(entry.id, { askingPrice: undefined });
    } else if (!isNaN(val) && val >= 0) {
      void updateBinderEntry(entry.id, { askingPrice: parseFloat(val.toFixed(2)) });
    }
  };

  const handleNotesBlur = () => {
    void updateBinderEntry(entry.id, { notes: notesInput.trim() || undefined });
  };

  return (
    <div className={`bg-slate-800 rounded-lg shadow-md overflow-hidden flex gap-4 p-4 border-l-4 ${accent}`}>
      <div className="flex-shrink-0 w-20 h-28 bg-slate-700 rounded-md overflow-hidden">
        {card?.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
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
          <p className="font-semibold text-slate-100 leading-tight text-sm">
            {card?.name ?? '(Card removed from collection)'}
          </p>
          <button
            onClick={() => removeCardFromBinder(entry.id)}
            className="text-slate-500 hover:text-red-400 transition-colors duration-150 flex-shrink-0 text-lg leading-none"
            title="Remove from binder"
          >
            ×
          </button>
        </div>

        {card?.type && <p className="text-xs text-slate-400 truncate">{card.type}</p>}
        {card?.set && (
          <p className="text-xs text-slate-500 truncate">
            {card.set}{card.rarity ? ` · ${card.rarity}` : ''}
          </p>
        )}
        {card?.condition && (
          <p className="text-xs text-slate-500">{card.condition}</p>
        )}
        {(card?.estimatedPrice !== undefined || card?.priceMid !== undefined) && (
          <p className="text-xs font-medium text-emerald-300">
            Est. per card {formatCurrencyPrice(card?.estimatedPrice ?? card?.priceMid, currency)}
          </p>
        )}

        {/* Sell Qty stepper */}
        <div className="flex items-center gap-2 flex-wrap mt-auto">
          <span className="text-xs text-slate-400 w-14">Sell Qty:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSellQtyDecrement}
              disabled={entry.sellQty <= 1}
              className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 font-bold text-base flex items-center justify-center transition-colors duration-150"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-slate-100">
              {entry.sellQty}
            </span>
            <button
              onClick={handleSellQtyIncrement}
              disabled={card !== undefined && entry.sellQty >= card.quantity}
              className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 font-bold text-base flex items-center justify-center transition-colors duration-150"
            >
              +
            </button>
          </div>
          {card && (
            <span className="text-xs text-slate-500">of {card.quantity} owned</span>
          )}
        </div>

        {/* Asking Price */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-14">Price $:</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            onBlur={handlePriceBlur}
            placeholder="e.g. 4.99"
            className="w-28 bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
          />
        </div>

        {/* Notes */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-14">Notes:</span>
          <input
            type="text"
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="e.g. slight edge wear"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>
    </div>
  );
}
