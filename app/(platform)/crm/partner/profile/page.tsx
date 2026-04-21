import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerProfilePage() {
  return (
    <AppShell title="Partner Dashboard" description="Firmenprofil und Regionen." nav={crmNavigation.partner}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Profil</h2>
        <p className="mt-2 text-sm text-slate-600">
          Basis für Firmendaten, Leistungsarten, Einsatzgebiete und Verifizierungsstatus.
        </p>
      </section>
    </AppShell>
  );
}
