import { AppShell } from '@/components/crm/AppShell';
import { EmployeeDashboardPanel } from '@/components/crm/EmployeeDashboardPanel';
import { crmNavigation } from '@/lib/crm/navigation';

export default function EmployeeLeadsPage() {
  return (
    <AppShell title="Mitarbeiter Dashboard" description="Operative Leads und Kontaktanfragen." nav={crmNavigation.employee}>
      <EmployeeDashboardPanel section="leads" />
    </AppShell>
  );
}
