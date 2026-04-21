import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerCrmPage() {
  return (
    <AppShell
      title="Partner Dashboard"
      description="Eigene Leads, Paketstatus, Regionen, Limits und Verifizierungsstatus."
      items={crmNavigation.partner}
    />
  );
}
