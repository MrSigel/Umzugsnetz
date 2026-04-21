import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminPartnersPage() {
  return (
    <AppShell title="Admin Dashboard" description="Partnerverwaltung und Verifizierung." nav={crmNavigation.admin}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Partner</h2>
        <p className="mt-2 text-sm text-slate-600">
          Übersicht für Partnerprofile, Verifizierungsstatus, Pakete und Freigaben.
        </p>
      </section>
    </AppShell>
  );
}
