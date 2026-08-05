import { type ChangeEvent, useRef, useState } from 'react';
import {
  exportCollectionToJson,
  importCollectionFromJson,
  type ImportResult,
} from '../services/collectionJson';

export default function CollectionImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      // Reset so the same file can be re-imported if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Import / Export JSON</h3>
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
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? 'Importing…' : 'Import JSON'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => { void handleImport(e); }}
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
          {result.warnings.map((w, i) => (
            <p key={i} className="text-amber-300">⚠ {w}</p>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
