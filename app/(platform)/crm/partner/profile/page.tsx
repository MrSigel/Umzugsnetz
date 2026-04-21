import { AppShell } from '@/components/crm/AppShell';
import { PartnerDashboardPanel } from '@/components/crm/PartnerDashboardPanel';
import { crmNavigation } from '@/lib/crm/navigation';

export default function PartnerProfilePage() {
  return (
    <AppShell title="Partner Dashboard" description="Firmenprofil und Regionen." nav={crmNavigation.partner}>
      <PartnerDashboardPanel section="profile" />
    </AppShell>
  );
}
