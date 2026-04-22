import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';
import { getAdminLeadSnapshot } from '@/lib/server/adminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  const leads = await getAdminLeadSnapshot();

  return (
    <AppShell title="Admin Dashboard" description="Lead-Steuerung und Matching." nav={crmNavigation.admin}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Leads</h2>
        <p className="mt-2 text-sm text-slate-600">
          Basis fuer Lead-Import, Matching, Paketpriorisierung und manuelle Zuweisung.
        </p>

        <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-900">Aktiver Import-Endpunkt</p>
          <p className="mt-2 text-sm text-emerald-800">
            POST <span className="font-mono">/api/leads/import</span> speichert Leads und erstellt automatische Zuweisungen.
          </p>
          <p className="mt-2 text-xs text-emerald-700">
            Matching: Paketprioritaet, Region, Leistung, Verfuegbarkeit, Lead-Limits und Partnerstatus.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Kunde</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Leistung</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Ort</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{lead.customer_name || 'Unbekannter Kunde'}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{lead.service_code}</td>
                  <td className="px-4 py-4 text-slate-700">{lead.city || 'Unbekannte Stadt'}</td>
                  <td className="px-4 py-4 text-slate-700">{lead.status}</td>
                  <td className="px-4 py-4 text-slate-700">{new Date(lead.requested_at).toLocaleDateString('de-DE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
