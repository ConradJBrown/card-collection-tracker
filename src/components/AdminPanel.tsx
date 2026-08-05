import { useCallback, useEffect, useState } from 'react';
import {
  listAllUsers,
  updateUserRole,
  getMyProfile,
  UserProfile,
  AppRole,
} from '../services/adminService';

const ROLE_OPTIONS: AppRole[] = ['owner', 'admin', 'member', 'viewer'];

const ROLE_BADGE: Record<AppRole, string> = {
  owner: 'bg-amber-950 text-amber-300 border-amber-800',
  admin: 'bg-indigo-950 text-indigo-300 border-indigo-800',
  member: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  viewer: 'bg-slate-800 text-slate-300 border-slate-700',
};

export default function AdminPanel() {
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getMyProfile();
      setMyProfile(profile);

      const isAdminOrOwner = profile?.role === 'owner' || profile?.role === 'admin';
      if (!isAdminOrOwner) {
        setUsers([]);
        return;
      }

      const allUsers = await listAllUsers();
      setUsers(allUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingId(userId);
    setSuccessMessage(null);
    setError(null);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      if (myProfile?.id === userId) {
        setMyProfile((prev) => (prev ? { ...prev, role: newRole } : prev));
      }
      setSuccessMessage('Role updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const canEditRoles =
    myProfile?.role === 'owner' || myProfile?.role === 'admin';

  return (
    <section className="mb-6 rounded-xl border border-slate-700 bg-slate-950/70 p-4 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Admin Panel</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage users and roles for this self-hosted install.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { void load(); }}
          disabled={loading}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {successMessage}
        </p>
      )}

      {!loading && !canEditRoles && (
        <p className="text-sm text-amber-300">
          You need <strong>owner</strong> or <strong>admin</strong> role to manage users.
        </p>
      )}

      {!loading && users.length === 0 && !error && (
        <p className="text-sm text-slate-400">No users found.</p>
      )}

      {users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Joined</th>
                {canEditRoles && <th className="pb-2 font-medium">Change Role</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800 last:border-0"
                >
                  <td className="py-2 pr-4 text-slate-200">
                    <span className="block font-medium">
                      {user.displayName ?? user.email ?? 'Unknown'}
                    </span>
                    {user.displayName && user.email && (
                      <span className="text-xs text-slate-400">{user.email}</span>
                    )}
                    {user.id === myProfile?.id && (
                      <span className="ml-1 text-xs text-slate-500">(you)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  {canEditRoles && (
                    <td className="py-2">
                      <select
                        value={user.role}
                        onChange={(e) => {
                          void handleRoleChange(user.id, e.target.value as AppRole);
                        }}
                        disabled={updatingId === user.id}
                        title={`Change role for ${user.email ?? user.id}`}
                        className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
