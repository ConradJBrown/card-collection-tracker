import { db } from './db';
import { listBinderEntries } from './binderDb';

function escapeCsvValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // Wrap in quotes if the value contains a comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  'Card Name',
  'Game',
  'Set',
  'Rarity',
  'Type',
  'Condition',
  'Qty to Sell',
  'Asking Price',
  'Notes',
  'Card ID',
];

export async function exportBinderToCsv(binderId: string): Promise<void> {
  const binder = await db.binders.get(binderId);
  if (!binder) throw new Error('Binder not found.');

  const entries = await listBinderEntries(binderId);

  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const entry of entries) {
    const card = entry.card;
    const row = [
      escapeCsvValue(card?.name),
      escapeCsvValue(card?.game),
      escapeCsvValue(card?.set),
      escapeCsvValue(card?.rarity),
      escapeCsvValue(card?.type),
      escapeCsvValue(card?.condition),
      escapeCsvValue(entry.sellQty),
      escapeCsvValue(entry.askingPrice),
      escapeCsvValue(entry.notes),
      escapeCsvValue(card?.cardId),
    ];
    rows.push(row.join(','));
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const safeName = binder.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-');
  const filename = `${safeName}-${date}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
