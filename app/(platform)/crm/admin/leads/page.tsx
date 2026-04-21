import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminLeadsPage() {
  return (
    <AppShell title="Admin Dashboard" description="Lead-Steuerung und Matching." nav={crmNavigation.admin}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Leads</h2>
        <p className="mt-2 text-sm text-slate-600">
          Basis für Lead-Import, Matching, Paketpriorisierung und manuelle Zuweisung.
        </p>
      </section>
    </AppShell>
  );
}
