import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminSettingsPage() {
  return (
    <AppShell title="Admin Dashboard" description="Systemkonfiguration und Business-Regeln." nav={crmNavigation.admin}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Einstellungen</h2>
        <p className="mt-2 text-sm text-slate-600">
          Basis für Preise, Paketregeln, Verzögerungen, IBAN-Daten und zentrale Einstellungen.
        </p>
      </section>
    </AppShell>
  );
}
