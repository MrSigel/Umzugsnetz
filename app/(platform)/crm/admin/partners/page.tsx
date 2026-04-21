import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';
import { getAdminPartnerSnapshot } from '@/lib/server/adminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPartnersPage() {
  const partners = await getAdminPartnerSnapshot();

  return (
    <AppShell title="Admin Dashboard" description="Partnerverwaltung und Verifizierung." nav={crmNavigation.admin}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Partner</h2>
        <p className="mt-2 text-sm text-slate-600">
          Uebersicht fuer Partnerprofile, Verifizierungsstatus, Pakete und Freigaben.
        </p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Firma</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Verifizierung</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Paket</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{partner.name}</p>
                    <p className="mt-1 text-slate-500">{partner.email || 'Keine E-Mail'}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{partner.status || 'PENDING'}</td>
                  <td className="px-4 py-4 text-slate-700">{partner.verification_status || 'PENDING'}</td>
                  <td className="px-4 py-4 text-slate-700">{partner.package_code || 'FREE'}</td>
                  <td className="px-4 py-4 text-slate-700">
                    {partner.lead_limit_used || 0} / {partner.lead_limit_monthly || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
