import { AppShell } from '@/components/crm/AppShell';
import { PartnerDashboardPanel } from '@/components/crm/PartnerDashboardPanel';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerCrmPage() {
  return (
    <AppShell
      title="Partner Dashboard"
      description="Eigene Leads, Paketstatus, Regionen, Limits und Verifizierungsstatus."
      nav={crmNavigation.partner}
    >
      <PartnerDashboardPanel section="overview" />
    </AppShell>
  );
}
