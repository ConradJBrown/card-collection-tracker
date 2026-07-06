import { FormEvent, useCallback, useEffect, useState } from 'react';
import { GameType } from './types';
import Layout from './components/Layout';
import CardSearch from './components/CardSearch';
import CollectionView from './components/CollectionView';
import AuthPanel from './components/AuthPanel';
import { appConfig, isSupabaseConfigured } from './config/env';
import { AuthMode, authProvider, AppSession } from './services/authProvider';
import {
  configureCollectionSync,
  listCollectionEntries,
  replaceCollection,
} from './services/db';
import {
  deleteCloudCollectionEntry,
  listCloudCollection,
  upsertCloudCollectionEntries,
  upsertCloudCollectionEntry,
} from './services/cloudCollection';
import {
  ensureCollectionBackup,
  getCollectionBackupEntries,
  getCollectionBackupSummary,
} from './services/localCollectionBackup';
import { migrateLegacyCollection } from './services/legacyCollection';

type ActiveTab = 'search' | 'collection';
type SyncStatus = 'idle' | 'syncing' | 'error';

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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>('yugioh');
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [session, setSession] = useState<AppSession | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [guestBackupCount, setGuestBackupCount] = useState(0);
  const [guestBackupUpdatedAt, setGuestBackupUpdatedAt] = useState<string | null>(null);

  const refreshBackupSummary = useCallback(async () => {
    const backupSummary = await getCollectionBackupSummary();
    setGuestBackupCount(backupSummary.totalEntries);
    setGuestBackupUpdatedAt(backupSummary.updatedAt);
  }, []);

  const syncRemoteCollection = useCallback(async (userId: string, preserveGuest: boolean) => {
    setSyncStatus('syncing');
    setSyncMessage('Syncing your cloud collection...');

    const localEntries = await listCollectionEntries();
    if (preserveGuest) {
      await ensureCollectionBackup(localEntries);
    }

    const remoteEntries = await listCloudCollection(userId);
    await replaceCollection(remoteEntries);
    await refreshBackupSummary();

    setSyncStatus('idle');
    setSyncMessage(
      remoteEntries.length > 0
        ? 'Cloud collection synced to this device.'
        : 'Cloud account is ready. Import your guest collection to populate it.'
    );
    setLastSyncedAt(new Date().toISOString());
  }, [refreshBackupSummary]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await migrateLegacyCollection();
        await refreshBackupSummary();

        if (!authProvider.isConfigured) {
          return;
        }

        const existingSession = await authProvider.getSession();
        if (!isMounted) return;

        setSession(existingSession);
        if (existingSession?.user.id) {
          await syncRemoteCollection(existingSession.user.id, true);
        }
      } catch (error) {
        if (!isMounted) return;
        setSyncStatus('error');
        setSyncMessage(`Initialization failed: ${getErrorMessage(error)}`);
      }
    };

    void initialize();

    const unsubscribe = authProvider.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);

      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('recovery');
        setAuthMessage('Enter a new password to finish resetting your account.');
        setAuthError(null);
        return;
      }

      try {
        if (nextSession?.user.id) {
          await syncRemoteCollection(nextSession.user.id, true);
          if (!isMounted) return;
          setAuthMode('signIn');
          setAuthPassword('');
        } else {
          const guestEntries = await getCollectionBackupEntries();
          await replaceCollection(guestEntries);
          await refreshBackupSummary();
          if (!isMounted) return;
          setSyncStatus('idle');
          setSyncMessage(
            guestEntries.length > 0
              ? 'Restored your local guest collection.'
              : 'Using local-only mode until you connect Supabase.'
          );
          setLastSyncedAt(null);
        }
      } catch (error) {
        if (!isMounted) return;
        setSyncStatus('error');
        setSyncMessage(getErrorMessage(error));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [refreshBackupSummary, syncRemoteCollection]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user.id) {
      configureCollectionSync({});
      return;
    }

    const userId = session.user.id;

    configureCollectionSync({
      onUpsert: async (entry) => {
        try {
          setSyncStatus('syncing');
          setSyncMessage('Syncing changes to the cloud...');
          await upsertCloudCollectionEntry(userId, entry);
          setSyncStatus('idle');
          setSyncMessage('All collection changes are synced.');
          setLastSyncedAt(new Date().toISOString());
        } catch (error) {
          setSyncStatus('error');
          setSyncMessage(getErrorMessage(error));
          throw error;
        }
      },
      onDelete: async (entryId) => {
        try {
          setSyncStatus('syncing');
          setSyncMessage('Syncing changes to the cloud...');
          await deleteCloudCollectionEntry(userId, entryId);
          setSyncStatus('idle');
          setSyncMessage('All collection changes are synced.');
          setLastSyncedAt(new Date().toISOString());
        } catch (error) {
          setSyncStatus('error');
          setSyncMessage(getErrorMessage(error));
          throw error;
        }
      },
      onSyncError: (error) => {
        setSyncStatus('error');
        setSyncMessage(error.message);
      },
    });

    return () => {
      configureCollectionSync({});
    };
  }, [session]);

  const syncCloudCollection = async (preserveGuest: boolean) => {
    if (!session?.user.id) return;

    try {
      setAuthLoading(true);
      setAuthError(null);
      await syncRemoteCollection(session.user.id, preserveGuest);
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(getErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      if (authMode === 'signIn') {
        await authProvider.signIn(authEmail, authPassword);
        setAuthMessage('Signed in successfully.');
      } else if (authMode === 'signUp') {
        await authProvider.signUp(authEmail, authPassword);
        setAuthMessage('Account created. Check your email to confirm access.');
      } else if (authMode === 'reset') {
        await authProvider.resetPassword(authEmail);
        setAuthMessage('Password reset email sent.');
      } else {
        await authProvider.updatePassword(authPassword);
        setAuthMode('signIn');
        setAuthMessage('Password updated. Sign in with your new password.');
      }

      setAuthPassword('');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      await authProvider.signOut();
      setAuthMessage('Signed out.');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleImportLocalData = async () => {
    if (!session?.user.id) return;

    try {
      setAuthLoading(true);
      setAuthError(null);
      const guestEntries = await getCollectionBackupEntries();

      if (guestEntries.length === 0) {
        setAuthMessage('No guest collection is waiting to be imported.');
        return;
      }

      await upsertCloudCollectionEntries(session.user.id, guestEntries);
      await syncCloudCollection(false);
      setAuthMessage(`Imported ${guestEntries.length} guest collection card(s) into your account.`);
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const tabs = TAB_STYLES[activeGame];

  return (
    <Layout activeGame={activeGame} onGameChange={(g) => { setActiveGame(g); setActiveTab('search'); }}>
      <AuthPanel
        deploymentMode={appConfig.deploymentMode}
        isConfigured={isSupabaseConfigured}
        loading={authLoading}
        mode={authMode}
        email={authEmail}
        password={authPassword}
        sessionEmail={session?.user.email ?? null}
        message={authMessage}
        error={authError}
        syncSummary={{
          status: syncStatus,
          message: syncMessage,
          lastSyncedAt,
          guestBackupCount,
          guestBackupUpdatedAt,
        }}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setAuthError(null);
          setAuthMessage(null);
        }}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSubmit}
        onSignOut={handleSignOut}
        onSyncNow={() => { void syncCloudCollection(false); }}
        onImportLocalData={() => { void handleImportLocalData(); }}
      />

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
