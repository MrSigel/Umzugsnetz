import { AppShell } from '@/components/crm/AppShell';
import { PartnerDashboardPanel } from '@/components/crm/PartnerDashboardPanel';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerLeadsPage() {
  return (
    <AppShell title="Partner Dashboard" description="Freigegebene Leads und Status." nav={crmNavigation.partner}>
      <PartnerDashboardPanel section="leads" />
    </AppShell>
  );
}
