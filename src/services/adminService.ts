import { requireSupabaseClient } from './supabaseClient';

export type AppRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  role: AppRole;
  createdAt: string;
}

const PROFILE_COLUMNS = 'id, email, display_name, default_role, created_at';

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  default_role: AppRole;
  created_at: string;
}

function toUserProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.default_role,
    createdAt: row.created_at,
  };
}

/** Fetch all user profiles. Requires the current user to be an owner or admin
 *  in the profiles table — Supabase RLS must allow it (see admin policy in schema). */
export async function listAllUsers(): Promise<UserProfile[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return ((data ?? []) as unknown as ProfileRow[]).map(toUserProfile);
}

/** Update a user's role. Only owners/admins should be able to call this
 *  (enforced via Supabase RLS policy). */
export async function updateUserRole(userId: string, role: AppRole): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('profiles')
    .update({ default_role: role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }
}

/** Fetch the current user's own profile, including their role. */
export async function getMyProfile(): Promise<UserProfile | null> {
  const client = requireSupabaseClient();
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return toUserProfile(data as unknown as ProfileRow);
}
