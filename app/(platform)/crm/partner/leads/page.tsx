import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerLeadsPage() {
  return (
    <AppShell title="Partner Dashboard" description="Freigegebene Leads und Status." nav={crmNavigation.partner}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Leads</h2>
        <p className="mt-2 text-sm text-slate-600">
          Basis fuer freigegebene Leads, Bearbeitungsstatus, Paketlogik und Verzoegerungen pro Stufe.
        </p>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Matching vorbereitet</p>
          <p className="mt-2 text-sm text-slate-700">
            Neue Leads werden kuenftig automatisch nach Paket, Region und Leistung in diesen Bereich eingesteuert.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
