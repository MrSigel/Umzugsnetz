import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerLeadsPage() {
  return (
    <AppShell title="Partner Dashboard" description="Freigegebene Leads und Status." nav={crmNavigation.partner}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Leads</h2>
        <p className="mt-2 text-sm text-slate-600">
          Basis für zugewiesene Leads, Bearbeitungsstatus und Limits.
        </p>
      </section>
    </AppShell>
  );
}
