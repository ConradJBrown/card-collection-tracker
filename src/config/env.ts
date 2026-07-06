export type DeploymentMode = 'hosted' | 'self-hosted';

const deploymentModeValue = import.meta.env.VITE_DEPLOYMENT_MODE;

export const appConfig = {
  deploymentMode: (deploymentModeValue === 'self-hosted' ? 'self-hosted' : 'hosted') as DeploymentMode,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  supabaseRedirectUrl:
    import.meta.env.VITE_SUPABASE_REDIRECT_URL?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : ''),
};

export const isSupabaseConfigured = Boolean(
  appConfig.supabaseUrl && appConfig.supabaseAnonKey
);
