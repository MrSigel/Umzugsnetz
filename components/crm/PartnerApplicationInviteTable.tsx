'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

type PartnerApplicationRow = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  location: string;
  status: string;
  verification_status: string;
  verification_score: number;
  invite_sent_at: string | null;
  invite_sent_to: string | null;
  created_at: string;
};

export function PartnerApplicationInviteTable({ applications }: { applications: PartnerApplicationRow[] }) {
  const { showToast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});

  const sendInvite = async (applicationId: string) => {
    setSavingId(applicationId);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        throw error || new Error('Sitzung nicht gefunden.');
      }

      const response = await fetch('/api/partner-applications/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ applicationId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Einladung konnte nicht versendet werden.');
      }

      setSentIds((current) => ({ ...current, [applicationId]: true }));
      showToast('success', 'Einladung versendet', 'Die Partner-Einladung wurde erfolgreich verschickt.');
    } catch (error: any) {
      showToast('error', 'Einladung fehlgeschlagen', error.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Firma</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Kontakt</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Verifizierung</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Einladung</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Aktion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {applications.map((application) => {
            const inviteAlreadySent = Boolean(application.invite_sent_at) || sentIds[application.id];
            return (
              <tr key={application.id}>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{application.company_name}</p>
                  <p className="mt-1 text-slate-500">{application.location}</p>
                </td>
                <td className="px-4 py-4 text-slate-700">
                  <p>{application.contact_name}</p>
                  <p className="mt-1 text-slate-500">{application.email}</p>
                </td>
                <td className="px-4 py-4 text-slate-700">{application.status}</td>
                <td className="px-4 py-4 text-slate-700">
                  {application.verification_status} ({application.verification_score})
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {inviteAlreadySent ? (application.invite_sent_to || application.email) : 'Noch nicht versendet'}
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    disabled={savingId === application.id || inviteAlreadySent}
                    onClick={() => sendInvite(application.id)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingId === application.id ? 'Versendet ...' : inviteAlreadySent ? 'Bereits versendet' : 'Einladung senden'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
