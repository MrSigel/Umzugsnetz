import Link from 'next/link';
import { AppShell } from '@/components/crm/AppShell';
import { ModuleGrid } from '@/components/crm/ModuleGrid';
import { StatCardGrid } from '@/components/crm/StatCardGrid';
import { crmNavigation } from '@/lib/crm/navigation';
import { getAdminLeadSnapshot, getAdminOverviewStats, getAdminPartnerSnapshot } from '@/lib/server/adminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminCrmPage() {
  const [stats, partners, leads] = await Promise.all([
    getAdminOverviewStats(),
    getAdminPartnerSnapshot(),
    getAdminLeadSnapshot(),
  ]);

  return (
    <AppShell
      title="Admin Dashboard"
      description="Zentrale Steuerung fuer Partner, Leads, Zahlungen und Einstellungen."
      nav={crmNavigation.admin}
    >
      <StatCardGrid
        items={[
          { label: 'Partner', value: String(stats.partnerCount), hint: `${stats.verifiedPartnerCount} verifiziert` },
          { label: 'Leads', value: String(stats.leadCount), hint: `${stats.queuedAssignmentCount} Zuweisungen in Queue` },
          { label: 'Mitarbeiter', value: String(stats.employeeCount), hint: 'Aktive interne Accounts' },
          { label: 'Import', value: '/api/leads/import', hint: 'Produktiver Lead-Endpunkt aktiv' },
        ]}
      />

      <ModuleGrid
        eyebrow="Admin"
        title="Operative Uebersicht"
        description="Grundmodule fuer Partnerverwaltung, Lead-Steuerung, Zahlungsmodell und interne Kommunikation."
        items={crmNavigation.admin}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Letzte Partner</h2>
              <p className="mt-2 text-sm text-slate-600">Aktuelle Partner- und Freigabestati.</p>
            </div>
            <Link href="/crm/admin/partners" className="text-sm font-bold text-brand-blue hover:underline">
              Alle ansehen
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {partners.map((partner) => (
              <div key={partner.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">{partner.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{partner.email || 'Keine E-Mail'}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{partner.package_code || 'FREE'}</p>
                    <p className="mt-1">{partner.verification_status || 'PENDING'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Neueste Leads</h2>
              <p className="mt-2 text-sm text-slate-600">Zuletzt importierte Leads im CRM.</p>
            </div>
            <Link href="/crm/admin/leads" className="text-sm font-bold text-brand-blue hover:underline">
              Alle ansehen
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">{lead.customer_name || 'Unbekannter Kunde'}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {lead.service_code} · {lead.city || 'Unbekannte Stadt'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{lead.status}</p>
                    <p className="mt-1">{new Date(lead.requested_at).toLocaleDateString('de-DE')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
