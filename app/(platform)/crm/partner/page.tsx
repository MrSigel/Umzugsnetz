import { AppShell } from '@/components/crm/AppShell';
import { ModuleGrid } from '@/components/crm/ModuleGrid';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerCrmPage() {
  return (
    <AppShell
      title="Partner Dashboard"
      description="Eigene Leads, Paketstatus, Regionen, Limits und Verifizierungsstatus."
      nav={crmNavigation.partner}
    >
      <ModuleGrid
        eyebrow="Partner"
        title="Arbeitsbereiche"
        description="Basis für Leadbearbeitung, Profilpflege und Abrechnung."
        items={crmNavigation.partner}
      />
    </AppShell>
  );
}
