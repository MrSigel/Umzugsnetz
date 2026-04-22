'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

type UserRow = {
  id: string;
  email: string;
  createdAt: string;
  confirmedAt: string | null;
  roles: string[];
};

const ROLE_OPTIONS = ['EMPLOYEE', 'PARTNER'] as const;

export function AdminUserRoleManager() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        throw error || new Error('Sitzung nicht gefunden.');
      }

      const response = await fetch('/api/admin/user-roles', {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Benutzer konnten nicht geladen werden.');
      }

      setUsers(payload.users || []);
    } catch (err: any) {
      showToast('error', 'Benutzer konnten nicht geladen werden', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const assignRole = async (userId: string, role: (typeof ROLE_OPTIONS)[number]) => {
    setSavingUserId(userId);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        throw error || new Error('Sitzung nicht gefunden.');
      }

      const response = await fetch('/api/admin/user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ userId, role }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Rolle konnte nicht zugewiesen werden.');
      }

      showToast('success', 'Rolle gespeichert', `${role} wurde zugewiesen.`);
      await loadUsers();
    } catch (err: any) {
      showToast('error', 'Zuweisung fehlgeschlagen', err.message);
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Benutzer & Rollen</h2>
      <p className="mt-2 text-sm text-slate-600">
        Registrierte Accounts koennen hier als Mitarbeiter oder Partner freigegeben werden.
      </p>

      {loading ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          Lade Benutzer ...
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">E-Mail</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Rollen</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-4 text-slate-900">{user.email}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {user.confirmedAt ? 'E-Mail bestaetigt' : 'Wartet auf E-Mail-Bestaetigung'}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {user.roles.length > 0 ? user.roles.join(', ') : 'Keine Rolle'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((role) => (
                        <button
                          key={role}
                          type="button"
                          disabled={savingUserId === user.id || user.roles.includes(role)}
                          onClick={() => assignRole(user.id, role)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingUserId === user.id ? 'Speichert ...' : `${role} zuweisen`}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
