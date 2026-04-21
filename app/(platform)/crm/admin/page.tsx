import { AppShell } from '@/components/crm/AppShell';
import { ModuleGrid } from '@/components/crm/ModuleGrid';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminCrmPage() {
  return (
    <AppShell
      title="Admin Dashboard"
      description="Zentrale Steuerung für Partner, Leads, Zahlungen und Einstellungen."
      nav={crmNavigation.admin}
    >
      <ModuleGrid
        eyebrow="Admin"
        title="Operative Übersicht"
        description="Grundmodule für Partnerverwaltung, Lead-Steuerung, Zahlungsmodell und interne Kommunikation."
        items={crmNavigation.admin}
      />
    </AppShell>
  );
}
