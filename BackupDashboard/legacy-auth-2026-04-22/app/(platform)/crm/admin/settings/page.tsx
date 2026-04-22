import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';
import { getAdminSettingsSnapshot } from '@/lib/server/adminDashboard';

export const dynamic = 'force-dynamic';

function formatValue(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default async function AdminSettingsPage() {
  const settings = await getAdminSettingsSnapshot();

  return (
    <AppShell title="Admin Dashboard" description="Systemkonfiguration und Business-Regeln." nav={crmNavigation.admin}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Einstellungen</h2>
        <p className="mt-2 text-sm text-slate-600">
          Zentrale Systemwerte fuer Preise, Billing, Wartung und Lead-Regeln.
        </p>

        <div className="mt-6 space-y-4">
          {settings.map((setting) => (
            <article key={setting.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">{setting.key}</p>
              <p className="mt-1 text-xs text-slate-500">
                Aktualisiert: {new Date(setting.updated_at).toLocaleString('de-DE')}
              </p>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
                {formatValue(setting.value)}
              </pre>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
