import { type GameType, type CardResult } from '../types';
import { CARD_CONDITIONS, type DbEntry, bulkAddToCollection } from './db';
import { searchYugioh } from './yugiohApi';
import { searchMtg } from './mtgApi';
import { searchPokemon } from './pokemonApi';
import { mtgDatabase } from './mtgDatabase';

const DEFAULT_CONDITION: DbEntry['condition'] = 'Near Mint';
const BULK_IMPORT_BATCH_SIZE = 200;
const MATCH_CONCURRENCY = 4;

type BulkImportStatus = 'matched' | 'ambiguous' | 'unmatched' | 'invalid';

export interface ParsedBulkImportLine {
  lineNumber: number;
  rawLine: string;
  quantity: number;
  name: string;
  set?: string;
  condition: DbEntry['condition'];
}

export interface BulkImportPreviewRow extends ParsedBulkImportLine {
  status: BulkImportStatus;
  warning?: string;
  candidates: CardResult[];
  matchedCard?: CardResult;
}

export interface BulkImportPreview {
  rows: BulkImportPreviewRow[];
  summary: {
    matched: number;
    ambiguous: number;
    unmatched: number;
    invalid: number;
  };
}

export interface BulkImportPreviewProgress {
  processed: number;
  total: number;
  status: string;
}

export interface BulkImportApplyProgress {
  processed: number;
  total: number;
  status: string;
}

export interface BulkImportApplyResult {
  importedRows: number;
  importedCards: number;
  skippedRows: number;
}

function normalizeValue(value: string) {
  return value.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').toLowerCase();
}

function isCondition(value: string): value is DbEntry['condition'] {
  return CARD_CONDITIONS.includes(value as DbEntry['condition']);
}

function toOptionalValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function escapeQuotedSearchTerm(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function isHeaderLine(line: string) {
  const tokens = line
    .split(/[,\t|]/)
    .map((part) => normalizeValue(part))
    .filter(Boolean);

  if (tokens.length === 0) {
    return false;
  }

  return tokens.every((token) => ['name', 'card name', 'quantity', 'qty', 'set', 'condition'].includes(token));
}

function parseCondition(parts: string[]) {
  const lastPart = parts[parts.length - 1]?.trim();
  if (!lastPart) {
    return {
      condition: DEFAULT_CONDITION,
      remaining: parts,
    };
  }

  if (isCondition(lastPart)) {
    return {
      condition: lastPart,
      remaining: parts.slice(0, -1),
    };
  }

  const normalized = normalizeValue(lastPart);
  const canonical = CARD_CONDITIONS.find((condition) => normalizeValue(condition) === normalized);
  if (!canonical) {
    return {
      condition: DEFAULT_CONDITION,
      remaining: parts,
    };
  }

  return {
    condition: canonical,
    remaining: parts.slice(0, -1),
  };
}

function parseDelimitedLine(rawLine: string, lineNumber: number): BulkImportPreviewRow {
  const separator = rawLine.includes('|')
    ? '|'
    : rawLine.includes('\t')
      ? '\t'
      : ',';
const parts = rawLine.split(separator).map((part) => part.trim());

  if (parts.length === 0) {
    return {
      lineNumber,
      rawLine,
      quantity: 0,
      name: '',
      condition: DEFAULT_CONDITION,
      status: 'invalid',
      warning: 'Line is empty.',
      candidates: [],
    };
  }

  const { condition, remaining } = parseCondition(parts);
  const quantityIndex = remaining.findIndex((part) => /^\d+$/.test(part));

  let quantity = 1;
  let name = '';
  let set: string | undefined;

  if (quantityIndex >= 0) {
    quantity = Number(remaining[quantityIndex]);
    const otherParts = remaining.filter((_, index) => index !== quantityIndex);
    name = otherParts[0] ?? '';
    set = otherParts.slice(1).join(' ');
  } else {
    name = remaining[0] ?? '';
    set = remaining.slice(1).join(' ');
  }

  if (!name || !Number.isInteger(quantity) || quantity <= 0) {
    return {
      lineNumber,
      rawLine,
      quantity,
      name,
      set: toOptionalValue(set),
      condition,
      status: 'invalid',
      warning: 'Expected a card name and a quantity greater than 0.',
      candidates: [],
    };
  }

  return {
    lineNumber,
    rawLine,
    quantity,
    name,
    set: toOptionalValue(set),
    condition,
    status: 'matched',
    candidates: [],
  };
}

function parseFreeformLine(rawLine: string, lineNumber: number): BulkImportPreviewRow {
  const quantityMatch = rawLine.match(/^(\d+)\s*x?\s+(.+)$/i);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
  const remainder = quantityMatch ? quantityMatch[2].trim() : rawLine.trim();

  if (!remainder || !Number.isInteger(quantity) || quantity <= 0) {
    return {
      lineNumber,
      rawLine,
      quantity,
      name: '',
      condition: DEFAULT_CONDITION,
      status: 'invalid',
      warning: 'Expected a card name and a quantity greater than 0.',
      candidates: [],
    };
  }

  return {
    lineNumber,
    rawLine,
    quantity,
    name: remainder,
    condition: DEFAULT_CONDITION,
    status: 'matched',
    candidates: [],
  };
}

export function parseBulkImportText(text: string): BulkImportPreviewRow[] {
  let headerChecked = false;

  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), rawLine: line, lineNumber: index + 1 }))
    .filter(({ line }) => line.length > 0)
    .filter(({ line }) => {
      if (headerChecked) return true;
      headerChecked = true;
      return !isHeaderLine(line);
    })
    .map(({ line, lineNumber }) => (
      /[,\t|]/.test(line) ? parseDelimitedLine(line, lineNumber) : parseFreeformLine(line, lineNumber)
    ));
}

function dedupeCandidates(cards: CardResult[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.game}:${card.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

let mtgIndexPromise: Promise<Record<string, CardResult> | null> | null = null;

async function loadExactMtgCard(name: string) {
  mtgIndexPromise ??= mtgDatabase.getSearchIndex();
  const index = await mtgIndexPromise;
  if (!index) {
    return null;
  }

  return index[normalizeValue(name)] ?? null;
}

async function fetchCandidates(game: GameType, name: string, set?: string): Promise<CardResult[]> {
  if (game === 'mtg' && !set) {
    try {
      const localCard = await loadExactMtgCard(name);
      if (localCard) {
        return [localCard];
      }
    } catch {
      // Fall back to remote lookup when the local database is unavailable.
    }
  }

  let results: CardResult[] = [];

  if (game === 'yugioh') {
    results = await searchYugioh(name);
  } else if (game === 'mtg') {
    results = await searchMtg(`!"${escapeQuotedSearchTerm(name)}"`);
  } else {
    results = await searchPokemon(name);
  }

  const exactNameMatches = results.filter((card) => normalizeValue(card.name) === normalizeValue(name));
  const filteredByName = exactNameMatches.length > 0 ? exactNameMatches : [];

  if (!set) {
    return dedupeCandidates(filteredByName);
  }

  const normalizedSet = normalizeValue(set);
  const exactSetMatches = filteredByName.filter((card) => normalizeValue(card.set ?? '') === normalizedSet);
  if (exactSetMatches.length > 0) {
    return dedupeCandidates(exactSetMatches);
  }

  const partialSetMatches = filteredByName.filter((card) => normalizeValue(card.set ?? '').includes(normalizedSet));
  return dedupeCandidates(partialSetMatches);
}

function buildPreviewRow(
  row: BulkImportPreviewRow,
  candidates: CardResult[]
): BulkImportPreviewRow {
  if (row.status === 'invalid') {
    return row;
  }

  if (candidates.length === 0) {
    return {
      ...row,
      status: 'unmatched',
      warning: row.set
        ? `No ${row.name} printing matched the set "${row.set}".`
        : `No ${row.name} match was found.`,
      candidates: [],
    };
  }

  if (candidates.length === 1) {
    return {
      ...row,
      status: 'matched',
      matchedCard: candidates[0],
      candidates,
    };
  }

  return {
    ...row,
    status: 'ambiguous',
    warning: `Multiple matches found for ${row.name}. Please choose one before importing.`,
    candidates,
  };
}

function summarizeRows(rows: BulkImportPreviewRow[]): BulkImportPreview['summary'] {
  return rows.reduce(
    (summary, row) => {
      summary[row.status] += 1;
      return summary;
    },
    {
      matched: 0,
      ambiguous: 0,
      unmatched: 0,
      invalid: 0,
    }
  );
}

export async function createBulkImportPreview(
  game: GameType,
  text: string,
  onProgress?: (progress: BulkImportPreviewProgress) => void
): Promise<BulkImportPreview> {
  const parsedRows = parseBulkImportText(text);
  const lookupRows = parsedRows.filter((row) => row.status !== 'invalid');
  const lookupKeys = [...new Set(lookupRows.map((row) => `${row.name}::${row.set ?? ''}`))];
  const lookupMap = new Map<string, CardResult[]>();

  onProgress?.({
    processed: 0,
    total: lookupKeys.length,
    status: lookupKeys.length > 0 ? 'Matching cards…' : 'No card lines to match.',
  });

  let processed = 0;
  const workers = Array.from({ length: Math.min(MATCH_CONCURRENCY, lookupKeys.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < lookupKeys.length; index += MATCH_CONCURRENCY) {
      const lookupKey = lookupKeys[index];
      const [name, set = ''] = lookupKey.split('::');
      const candidates = await fetchCandidates(game, name, set || undefined);
      lookupMap.set(lookupKey, candidates);
      processed += 1;

      onProgress?.({
        processed,
        total: lookupKeys.length,
        status: 'Matching cards…',
      });
    }
  });

  await Promise.all(workers);

  const rows = parsedRows.map((row) => {
    if (row.status === 'invalid') {
      return row;
    }

    const candidates = lookupMap.get(`${row.name}::${row.set ?? ''}`) ?? [];
    return buildPreviewRow(row, candidates);
  });

  return {
    rows,
    summary: summarizeRows(rows),
  };
}

function toDbEntry(game: GameType, row: BulkImportPreviewRow, card: CardResult): DbEntry {
  return {
    id: `${game}-${card.id}`,
    cardId: card.id,
    game,
    name: card.name,
    imageUrl: card.imageUrl,
    type: card.type,
    set: card.set,
    rarity: card.rarity,
    description: card.description,
    priceLow: card.priceLow,
    priceMid: card.priceMid,
    priceHigh: card.priceHigh,
    estimatedPrice: card.estimatedPrice ?? card.priceMid,
    quantity: row.quantity,
    condition: row.condition,
    addedAt: new Date().toISOString(),
  };
}

export async function applyBulkImport(
  game: GameType,
  rows: BulkImportPreviewRow[],
  selectedCards: Record<number, string>,
  onProgress?: (progress: BulkImportApplyProgress) => void
): Promise<BulkImportApplyResult> {
  const selectedEntries = rows.flatMap((row) => {
    if (row.status === 'invalid' || row.status === 'unmatched') {
      return [];
    }

    const chosenCardId = row.matchedCard?.id ?? selectedCards[row.lineNumber];
    if (!chosenCardId) {
      return [];
    }

    const chosenCard = row.candidates.find((candidate) => candidate.id === chosenCardId) ?? row.matchedCard;
    if (!chosenCard) {
      return [];
    }

    return [toDbEntry(game, row, chosenCard)];
  });

  onProgress?.({
    processed: 0,
    total: selectedEntries.length,
    status: selectedEntries.length > 0 ? 'Saving cards…' : 'No resolved rows to import.',
  });

  for (let index = 0; index < selectedEntries.length; index += BULK_IMPORT_BATCH_SIZE) {
    const batch = selectedEntries.slice(index, index + BULK_IMPORT_BATCH_SIZE);
    await bulkAddToCollection(batch);

    onProgress?.({
      processed: Math.min(index + batch.length, selectedEntries.length),
      total: selectedEntries.length,
      status: 'Saving cards…',
    });
  }

  return {
    importedRows: selectedEntries.length,
    importedCards: selectedEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    skippedRows: rows.length - selectedEntries.length,
  };
}
