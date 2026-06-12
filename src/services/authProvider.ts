import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { appConfig, isSupabaseConfigured } from '../config/env';
import { supabase } from './supabaseClient';

export type AppSession = Session;
export type AuthMode = 'signIn' | 'signUp' | 'reset' | 'recovery';

export interface AuthProvider {
  isConfigured: boolean;
  getSession: () => Promise<AppSession | null>;
  onAuthStateChange: (
    callback: (event: AuthChangeEvent, session: AppSession | null) => void | Promise<void>
  ) => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export const authProvider: AuthProvider = {
  isConfigured: isSupabaseConfigured,
  async getSession() {
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getSession();
    throwIfError(error);
    return data.session;
  },
  onAuthStateChange(callback) {
    if (!supabase) {
      return () => undefined;
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      void callback(event, session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  },
  async signIn(email, password) {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithPassword({ email, password });
    throwIfError(error);
  },
  async signUp(email, password) {
    const client = requireSupabase();
    const { error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: appConfig.supabaseRedirectUrl,
      },
    });
    throwIfError(error);
  },
  async signOut() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    throwIfError(error);
  },
  async resetPassword(email) {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: appConfig.supabaseRedirectUrl,
    });
    throwIfError(error);
  },
  async updatePassword(password) {
    const client = requireSupabase();
    const { error } = await client.auth.updateUser({ password });
    throwIfError(error);
  },
};
