import { create } from 'zustand';
import { CurrencyCode } from '../services/priceUtils';

const STORAGE_KEY = 'price-display-currency';

interface PriceDisplayStore {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

function getInitialCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const allowed: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
  return allowed.includes(stored as CurrencyCode) ? (stored as CurrencyCode) : 'USD';
}

export const usePriceDisplayStore = create<PriceDisplayStore>((set) => ({
  currency: getInitialCurrency(),
  setCurrency: (currency) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, currency);
    }
    set({ currency });
  },
}));
