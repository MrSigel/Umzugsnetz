import { AppShell } from '@/components/crm/AppShell';
import { PartnerDashboardPanel } from '@/components/crm/PartnerDashboardPanel';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerBillingPage() {
  return (
    <AppShell title="Partner Dashboard" description="Abrechnung und Paketstatus." nav={crmNavigation.partner}>
      <PartnerDashboardPanel section="billing" />
    </AppShell>
  );
}
