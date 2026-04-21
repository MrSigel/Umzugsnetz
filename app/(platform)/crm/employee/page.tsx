import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function EmployeeCrmPage() {
  return (
    <AppShell
      title="Mitarbeiter Dashboard"
      description="Grundgerüst für spätere operative Arbeitsbereiche."
      items={crmNavigation.employee}
    />
  );
}
