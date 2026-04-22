import { AppShell } from '@/components/crm/AppShell';
import { StatCardGrid } from '@/components/crm/StatCardGrid';
import { crmNavigation } from '@/lib/crm/navigation';
import { getAdminCommunicationSnapshot } from '@/lib/server/adminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminChatsPage() {
  const snapshot = await getAdminCommunicationSnapshot();

  return (
    <AppShell title="Admin Dashboard" description="Chats und Kontaktverlaeufe." nav={crmNavigation.admin}>
      <StatCardGrid
        items={[
          { label: 'Offene Chats', value: String(snapshot.stats.openConversationCount), hint: 'Chat-Konversationen mit Status OPEN' },
          { label: 'Ungelesen', value: String(snapshot.stats.unreadMessageCount), hint: 'Chat-Nachrichten noch ungelesen' },
          { label: 'Kontaktanfragen', value: String(snapshot.stats.openContactRequestCount), hint: 'Noch nicht erledigt' },
          { label: 'Inbox', value: 'Live', hint: 'Chat und Kontaktkanal aktiv' },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Konversationen</h2>
          <p className="mt-2 text-sm text-slate-600">Gespeicherte Website-Chats.</p>

          <div className="mt-6 space-y-3">
            {snapshot.conversations.map((conversation) => (
              <div key={conversation.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                <p className="font-bold text-slate-900">{conversation.customer_name || 'Unbekannter Kontakt'}</p>
                <p className="mt-1 text-sm text-slate-600">{conversation.customer_email || 'Keine E-Mail'}</p>
                <p className="mt-1 text-sm text-slate-600">{conversation.source} · {conversation.status}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Letzte Nachrichten</h2>
          <p className="mt-2 text-sm text-slate-600">Neueste Chat-Aktivitaet ueber alle Sessions.</p>

          <div className="mt-6 space-y-3">
            {snapshot.recentMessages.map((message) => (
              <div key={message.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                <p className="font-bold text-slate-900">{message.user_name || message.sender}</p>
                <p className="mt-1 text-sm text-slate-600">{message.support_category} · {message.is_read ? 'gelesen' : 'ungelesen'}</p>
                <p className="mt-2 text-sm text-slate-700 line-clamp-3">{message.text}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Kontaktanfragen</h2>
        <p className="mt-2 text-sm text-slate-600">Kontaktformular-Anfragen aus Website und Partnerbereich.</p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">E-Mail</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Kategorie</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {snapshot.contactRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-4 text-slate-700">{request.first_name} {request.last_name}</td>
                  <td className="px-4 py-4 text-slate-700">{request.email}</td>
                  <td className="px-4 py-4 text-slate-700">{request.support_category}</td>
                  <td className="px-4 py-4 text-slate-700">{request.status}</td>
                  <td className="px-4 py-4 text-slate-700">{new Date(request.created_at).toLocaleDateString('de-DE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
