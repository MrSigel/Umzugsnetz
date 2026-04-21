import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminChatsPage() {
  return (
    <AppShell title="Admin Dashboard" description="Chats und Kontaktverläufe." nav={crmNavigation.admin}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Chats</h2>
        <p className="mt-2 text-sm text-slate-600">
          Basis für gespeicherte Chat-Konversationen und spätere interne Bearbeitung.
        </p>
      </section>
    </AppShell>
  );
}
