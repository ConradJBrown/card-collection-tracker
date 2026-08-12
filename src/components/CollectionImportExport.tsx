import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { type GameType } from '../types';
import {
  applyBulkImport,
  createBulkImportPreview,
  type BulkImportPreview,
  type BulkImportPreviewRow,
  type BulkImportApplyResult,
} from '../services/bulkImport';
import {
  exportCollectionToJson,
  importCollectionFromJson,
  type ImportResult,
} from '../services/collectionJson';

interface CollectionImportExportProps {
  game: GameType;
}

const GAME_LABELS: Record<GameType, string> = {
  yugioh: 'Yu-Gi-Oh!',
  mtg: 'Magic: The Gathering',
  pokemon: 'Pokémon',
};

const STATUS_STYLES: Record<BulkImportPreviewRow['status'], string> = {
  matched: 'border-emerald-900 bg-emerald-950/30 text-emerald-200',
  ambiguous: 'border-amber-900 bg-amber-950/30 text-amber-200',
  unmatched: 'border-rose-900 bg-rose-950/30 text-rose-200',
  invalid: 'border-slate-700 bg-slate-900/60 text-slate-300',
};

function summarizeRow(row: BulkImportPreviewRow) {
  if (row.matchedCard) {
    return row.matchedCard.set
      ? `${row.matchedCard.name} · ${row.matchedCard.set}${row.matchedCard.rarity ? ` · ${row.matchedCard.rarity}` : ''}`
      : row.matchedCard.name;
  }

  return row.name;
}

export default function CollectionImportExport({ game }: CollectionImportExportProps) {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<BulkImportPreview | null>(null);
  const [bulkSelections, setBulkSelections] = useState<Record<number, string>>({});
  const [bulkPreviewing, setBulkPreviewing] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ processed: number; total: number; status: string } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkImportApplyResult | null>(null);

  useEffect(() => {
    setBulkPreview(null);
    setBulkSelections({});
    setBulkProgress(null);
    setBulkError(null);
    setBulkResult(null);
  }, [game]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setResult(null);
    try {
      await exportCollectionToJson();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await importCollectionFromJson(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = '';
      }
    }
  };

  const handleBulkFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setBulkText(text);
      setBulkPreview(null);
      setBulkSelections({});
      setBulkProgress(null);
      setBulkError(null);
      setBulkResult(null);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to read the import file.');
    } finally {
      if (bulkFileInputRef.current) {
        bulkFileInputRef.current.value = '';
      }
    }
  };

  const handleBulkPreview = async () => {
    if (!bulkText.trim()) {
      setBulkError('Paste card lines or upload a CSV/TXT file first.');
      return;
    }

    setBulkPreviewing(true);
    setBulkPreview(null);
    setBulkSelections({});
    setBulkProgress(null);
    setBulkError(null);
    setBulkResult(null);

    try {
      const preview = await createBulkImportPreview(game, bulkText, (progress) => {
        setBulkProgress(progress);
      });
      setBulkPreview(preview);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk import preview failed.');
    } finally {
      setBulkPreviewing(false);
    }
  };

  const handleBulkImportConfirm = async () => {
    if (!bulkPreview) {
      return;
    }

    setBulkImporting(true);
    setBulkError(null);
    setBulkResult(null);

    try {
      const applied = await applyBulkImport(game, bulkPreview.rows, bulkSelections, (progress) => {
        setBulkProgress(progress);
      });
      setBulkResult(applied);
      setBulkPreview(null);
      setBulkSelections({});
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      setBulkImporting(false);
    }
  };

  const importableRows = useMemo(
    () => bulkPreview?.rows.filter((row) => row.matchedCard || bulkSelections[row.lineNumber]).length ?? 0,
    [bulkPreview, bulkSelections]
  );
  const unmatchedRows = bulkPreview?.rows.filter((row) => row.status === 'unmatched' || row.status === 'invalid') ?? [];
  const ambiguousRows = bulkPreview?.rows.filter((row) => row.status === 'ambiguous') ?? [];
  const matchedRows = bulkPreview?.rows.filter((row) => row.status === 'matched') ?? [];
  const unresolvedAmbiguousRows = ambiguousRows.filter((row) => !bulkSelections[row.lineNumber]).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Bulk Add Cards</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste one {GAME_LABELS[game]} card per line or upload a CSV/TXT list to preview before importing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => bulkFileInputRef.current?.click()}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Upload CSV / TXT
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkText('');
                setBulkPreview(null);
                setBulkSelections({});
                setBulkProgress(null);
                setBulkError(null);
                setBulkResult(null);
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>

        <input
          ref={bulkFileInputRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={(event) => { void handleBulkFileImport(event); }}
          className="hidden"
          aria-label="Upload bulk card import file"
        />

        <textarea
          value={bulkText}
          onChange={(event) => setBulkText(event.target.value)}
          rows={8}
          placeholder={`Examples:\n4 Dark Magician\n2, Blue-Eyes White Dragon\n1 | Stardust Dragon | Mint\n3, Pikachu, Base Set, Near Mint`}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 space-y-1">
            <p>Accepted formats: <span className="text-slate-300">4 Dark Magician</span>, <span className="text-slate-300">2, Card Name</span>, <span className="text-slate-300">1 | Card Name | Set | Near Mint</span></p>
            <p>Condition defaults to <span className="text-slate-300">Near Mint</span>. The app stores one condition per unique card printing.</p>
          </div>

          <button
            type="button"
            onClick={() => { void handleBulkPreview(); }}
            disabled={bulkPreviewing || bulkImporting || !bulkText.trim()}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkPreviewing ? 'Building Preview…' : 'Preview Bulk Import'}
          </button>
        </div>

        {bulkProgress && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span>{bulkProgress.status}</span>
              <span>{bulkProgress.processed}/{bulkProgress.total || 0}</span>
            </div>
            {bulkProgress.total > 0 && (
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-indigo-400 transition-all duration-200"
                  style={{ width: `${(bulkProgress.processed / bulkProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {bulkResult && (
          <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200 space-y-1">
            <p className="font-medium">Bulk import complete</p>
            <p>{bulkResult.importedRows} row{bulkResult.importedRows === 1 ? '' : 's'} imported.</p>
            <p>{bulkResult.importedCards} total card{bulkResult.importedCards === 1 ? '' : 's'} added.</p>
            {bulkResult.skippedRows > 0 && (
              <p>{bulkResult.skippedRows} row{bulkResult.skippedRows === 1 ? '' : 's'} skipped.</p>
            )}
          </div>
        )}

        {bulkError && (
          <p className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            {bulkError}
          </p>
        )}

        {bulkPreview && (
          <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-950/50 px-2 py-1 text-emerald-200">
                  {bulkPreview.summary.matched} matched
                </span>
                <span className="rounded-full bg-amber-950/50 px-2 py-1 text-amber-200">
                  {bulkPreview.summary.ambiguous} ambiguous
                </span>
                <span className="rounded-full bg-rose-950/50 px-2 py-1 text-rose-200">
                  {bulkPreview.summary.unmatched} unmatched
                </span>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">
                  {bulkPreview.summary.invalid} invalid
                </span>
              </div>

              <button
                type="button"
                onClick={() => { void handleBulkImportConfirm(); }}
                disabled={bulkImporting || importableRows === 0}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkImporting ? 'Importing…' : `Import ${importableRows} Resolved Row${importableRows === 1 ? '' : 's'}`}
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>{importableRows} row{importableRows === 1 ? '' : 's'} are ready to import.</p>
              {unresolvedAmbiguousRows > 0 && (
                <p>{unresolvedAmbiguousRows} ambiguous row{unresolvedAmbiguousRows === 1 ? '' : 's'} still need a selection.</p>
              )}
              {unmatchedRows.length > 0 && (
                <p>{unmatchedRows.length} row{unmatchedRows.length === 1 ? '' : 's'} will be skipped unless you edit the source text and preview again.</p>
              )}
            </div>

            {ambiguousRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-100">Resolve ambiguous matches</h4>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {ambiguousRows.map((row) => (
                    <div key={row.lineNumber} className={`rounded-lg border px-3 py-2 text-xs ${STATUS_STYLES[row.status]}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">Line {row.lineNumber}: {row.quantity} × {row.name}</p>
                          {row.set && <p className="mt-1">Requested set: {row.set}</p>}
                          {row.warning && <p className="mt-1">{row.warning}</p>}
                        </div>
<select
  value={bulkSelections[row.lineNumber] ?? ''}
  onChange={(event) => {
    setBulkSelections((current) => ({
      ...current,
      [row.lineNumber]: event.target.value,
    }));
  }}
  aria-label={`Choose a card match for line ${row.lineNumber}`}
  className="min-w-60 rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
>
                          <option value="">Choose a card</option>
                          {row.candidates.map((candidate) => (
                            <option key={`${candidate.game}-${candidate.id}`} value={candidate.id}>
                              {candidate.name}{candidate.set ? ` · ${candidate.set}` : ''}{candidate.rarity ? ` · ${candidate.rarity}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-slate-300">
                        <span className="rounded-full bg-slate-900/70 px-2 py-0.5">Condition: {row.condition}</span>
                        <span className="rounded-full bg-slate-900/70 px-2 py-0.5">Qty: {row.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unmatchedRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-100">Skipped rows</h4>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {unmatchedRows.map((row) => (
                    <div key={row.lineNumber} className={`rounded-lg border px-3 py-2 text-xs ${STATUS_STYLES[row.status]}`}>
                      <p className="font-medium">Line {row.lineNumber}: {row.rawLine}</p>
                      {row.warning && <p className="mt-1">{row.warning}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchedRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-100">Ready to import</h4>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {matchedRows.slice(0, 100).map((row) => (
                    <div key={row.lineNumber} className={`rounded-lg border px-3 py-2 text-xs ${STATUS_STYLES[row.status]}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">Line {row.lineNumber}: {row.quantity} × {row.name}</p>
                          <p className="mt-1">{summarizeRow(row)}</p>
                        </div>
                        <span className="rounded-full bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-100">
                          {row.condition}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {matchedRows.length > 100 && (
                  <p className="text-xs text-slate-500">
                    Showing the first 100 matched rows. The remaining matched rows will still import.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Import / Export JSON Backup</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Back up your entire collection, binders, and binder entries as a JSON file.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { void handleExport(); }}
              disabled={exporting}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? 'Exporting…' : 'Export JSON'}
            </button>

            <button
              type="button"
              onClick={() => jsonFileInputRef.current?.click()}
              disabled={importing}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? 'Importing…' : 'Import JSON'}
            </button>

            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(event) => { void handleImport(event); }}
              className="hidden"
              aria-label="Import collection JSON file"
            />
          </div>
        </div>

        {result && (
          <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-200 space-y-1">
            <p className="font-medium">Import complete</p>
            <p>{result.collectionImported} collection entr{result.collectionImported === 1 ? 'y' : 'ies'} imported.</p>
            {result.bindersImported > 0 && (
              <p>{result.bindersImported} binder{result.bindersImported === 1 ? '' : 's'} imported.</p>
            )}
            {result.binderEntriesImported > 0 && (
              <p>{result.binderEntriesImported} binder entr{result.binderEntriesImported === 1 ? 'y' : 'ies'} imported.</p>
            )}
            {result.warnings.map((warning, index) => (
              <p key={index} className="text-amber-300">⚠ {warning}</p>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
