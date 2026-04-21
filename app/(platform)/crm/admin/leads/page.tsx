import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminLeadsPage() {
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
      </section>
    </AppShell>
  );
}
