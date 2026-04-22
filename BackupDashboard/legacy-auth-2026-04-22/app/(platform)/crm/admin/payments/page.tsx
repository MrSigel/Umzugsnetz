import { AppShell } from '@/components/crm/AppShell';
import { StatCardGrid } from '@/components/crm/StatCardGrid';
import { crmNavigation } from '@/lib/crm/navigation';
import { getAdminPaymentSnapshot } from '@/lib/server/adminDashboard';

export const dynamic = 'force-dynamic';

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(value));
}

function formatMoney(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

export default async function AdminPaymentsPage() {
  const snapshot = await getAdminPaymentSnapshot();

  return (
    <AppShell title="Admin Dashboard" description="Zahlungen, Pakete und Abos." nav={crmNavigation.admin}>
      <StatCardGrid
        items={[
          { label: 'Zahlungen', value: String(snapshot.stats.paymentCount), hint: `${snapshot.stats.paidCount} bezahlt` },
          { label: 'Aktive Abos', value: String(snapshot.stats.activeSubscriptionCount), hint: 'Aktive Subscription-Eintraege' },
          { label: 'Topups offen', value: String(snapshot.stats.openTopupRequestCount), hint: 'Manuelle Pruefung noetig' },
          { label: 'Provider', value: 'STRIPE', hint: 'Aktueller Zahlungsprovider' },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Letzte Zahlungen</h2>
          <p className="mt-2 text-sm text-slate-600">Bezahlt, offen oder fehlgeschlagen nach Partnerkonto.</p>

          <div className="mt-6 space-y-3">
            {snapshot.payments.map((payment) => (
              <div key={payment.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                <p className="font-bold text-slate-900">{(payment.partner as { name?: string } | null)?.name || 'Unbekannter Partner'}</p>
                <p className="mt-1 text-sm text-slate-600">{formatMoney(payment.amount, payment.currency)}</p>
                <p className="mt-1 text-sm text-slate-600">{payment.status} · {payment.provider}</p>
                <p className="mt-1 text-xs text-slate-500">Bezahlt: {formatDate(payment.paid_at)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Aktuelle Abos</h2>
          <p className="mt-2 text-sm text-slate-600">Paketstatus und Laufzeiten pro Partner.</p>

          <div className="mt-6 space-y-3">
            {snapshot.subscriptions.map((subscription) => (
              <div key={subscription.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                <p className="font-bold text-slate-900">{(subscription.partner as { name?: string } | null)?.name || 'Unbekannter Partner'}</p>
                <p className="mt-1 text-sm text-slate-600">{subscription.package_code} · {subscription.status}</p>
                <p className="mt-1 text-xs text-slate-500">Periode endet: {formatDate(subscription.current_period_end)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Wallet-Topup-Anfragen</h2>
        <p className="mt-2 text-sm text-slate-600">Offene manuelle Guthabenaufladungen von Partnern.</p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Partner</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Referenz</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Betrag</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {snapshot.topupRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-4 text-slate-700">{(request.partner as { name?: string } | null)?.name || 'Unbekannter Partner'}</td>
                  <td className="px-4 py-4 text-slate-700">{request.reference}</td>
                  <td className="px-4 py-4 text-slate-700">{formatMoney(request.amount)}</td>
                  <td className="px-4 py-4 text-slate-700">{request.status}</td>
                  <td className="px-4 py-4 text-slate-700">{formatDate(request.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
