import { AppShell } from '@/components/crm/AppShell';
import { EmployeeDashboardPanel } from '@/components/crm/EmployeeDashboardPanel';
import { crmNavigation } from '@/lib/crm/navigation';

export default function EmployeeCrmPage() {
  return (
    <AppShell
      title="Mitarbeiter Dashboard"
      description="Operative Uebersicht fuer Leads, Kontaktanfragen und Partneranfragen."
      nav={crmNavigation.employee}
    >
      <EmployeeDashboardPanel section="overview" />
    </AppShell>
  );
}
