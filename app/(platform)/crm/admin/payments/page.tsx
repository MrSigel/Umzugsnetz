import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminPaymentsPage() {
  return (
    <AppShell title="Admin Dashboard" description="Zahlungen, Pakete und Abos." nav={crmNavigation.admin}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Zahlungen</h2>
        <p className="mt-2 text-sm text-slate-600">
          Basis für Stripe-Abos, Banküberweisungen und Zahlungsstatus.
        </p>
      </section>
    </AppShell>
  );
}
