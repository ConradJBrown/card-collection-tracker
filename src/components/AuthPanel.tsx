import { FormEvent } from 'react';
import { DeploymentMode } from '../config/env';
import { AuthMode } from '../services/authProvider';

interface SyncSummary {
  status: 'idle' | 'syncing' | 'error';
  message: string | null;
  lastSyncedAt: string | null;
  guestBackupCount: number;
  guestBackupUpdatedAt: string | null;
}

interface AuthPanelProps {
  deploymentMode: DeploymentMode;
  isConfigured: boolean;
  loading: boolean;
  mode: AuthMode;
  email: string;
  password: string;
  sessionEmail: string | null;
  message: string | null;
  error: string | null;
  syncSummary: SyncSummary;
  onModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onImportLocalData: () => void;
}

const MODE_LABEL: Record<AuthMode, string> = {
  signIn: 'Sign In',
  signUp: 'Create Account',
  reset: 'Reset Password',
  recovery: 'Set New Password',
};

export default function AuthPanel({
  deploymentMode,
  isConfigured,
  loading,
  mode,
  email,
  password,
  sessionEmail,
  message,
  error,
  syncSummary,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSignOut,
  onSyncNow,
  onImportLocalData,
}: AuthPanelProps) {
  const isSignedIn = Boolean(sessionEmail);
  const emailId = 'auth-email';
  const passwordId = 'auth-password';

  return (
    <section className="mb-6 rounded-xl border border-slate-700 bg-slate-950/70 p-4 shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Phase 2 Accounts</h2>
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {deploymentMode === 'self-hosted' ? 'Self-hosted mode' : 'Hosted mode'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isConfigured
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {isConfigured ? 'Supabase configured' : 'Local-only fallback'}
            </span>
          </div>

          <p className="text-sm text-slate-400">
            Accounts add cross-device sync now, while keeping the auth boundary ready for future company installs.
          </p>

          {!isConfigured && (
            <p className="text-sm text-amber-300">
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file to enable sign-in, cloud sync, and recovery flows.
            </p>
          )}

          {isSignedIn && (
            <div className="space-y-1 text-sm text-slate-300">
              <p>Signed in as <span className="font-medium text-slate-100">{sessionEmail}</span></p>
              {syncSummary.lastSyncedAt && (
                <p className="text-xs text-slate-500">
                  Last synced {new Date(syncSummary.lastSyncedAt).toLocaleString()}
                </p>
              )}
              {syncSummary.guestBackupCount > 0 && (
                <p className="text-xs text-slate-400">
                  Guest backup ready: {syncSummary.guestBackupCount} card(s)
                  {syncSummary.guestBackupUpdatedAt ? ` from ${new Date(syncSummary.guestBackupUpdatedAt).toLocaleDateString()}` : ''}.
                </p>
              )}
            </div>
          )}
        </div>

        {isConfigured && !isSignedIn ? (
          <div className="w-full max-w-md space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onModeChange('signIn')}
                className={`rounded-md px-3 py-1.5 text-sm ${mode === 'signIn' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => onModeChange('signUp')}
                className={`rounded-md px-3 py-1.5 text-sm ${mode === 'signUp' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => onModeChange('reset')}
                className={`rounded-md px-3 py-1.5 text-sm ${mode === 'reset' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                Reset password
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              {mode !== 'recovery' && (
                <div className="space-y-1">
                  <label htmlFor={emailId} className="sr-only">
                    Email address
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
                  />
                </div>
              )}

              {mode !== 'reset' && mode !== 'signUp' && mode !== 'recovery' && (
                <div className="space-y-1">
                  <label htmlFor={passwordId} className="sr-only">
                    Password
                  </label>
                  <input
                    id={passwordId}
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
                  />
                </div>
              )}

              {(mode === 'signUp' || mode === 'recovery') && (
                <div className="space-y-1">
                  <label htmlFor={passwordId} className="sr-only">
                    {mode === 'recovery' ? 'New password' : 'Password'}
                  </label>
                  <input
                    id={passwordId}
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder={mode === 'recovery' ? 'New password' : 'Password'}
                    autoComplete="new-password"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Working...' : MODE_LABEL[mode]}
              </button>
            </form>
          </div>
        ) : isSignedIn ? (
          <div className="flex w-full max-w-md flex-col gap-2">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={loading || syncSummary.status === 'syncing'}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncSummary.status === 'syncing' ? 'Syncing...' : 'Sync cloud collection'}
            </button>

            {syncSummary.guestBackupCount > 0 && (
              <button
                type="button"
                onClick={onImportLocalData}
                disabled={loading}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Import guest collection into this account
              </button>
            )}

            <button
              type="button"
              onClick={onSignOut}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      {(message || error || syncSummary.message) && (
        <div className="mt-4 space-y-2 text-sm">
          {message && <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-emerald-200">{message}</p>}
          {syncSummary.message && syncSummary.status !== 'error' && (
            <p className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-300">
              {syncSummary.message}
            </p>
          )}
          {(error || (syncSummary.status === 'error' ? syncSummary.message : null)) && (
            <p className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-rose-200">
              {error ?? syncSummary.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
