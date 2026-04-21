import { AppShell } from '@/components/crm/AppShell';
import { ModuleGrid } from '@/components/crm/ModuleGrid';
import { crmNavigation } from '@/lib/crm/navigation';

export default function EmployeeCrmPage() {
  return (
    <AppShell
      title="Mitarbeiter Dashboard"
      description="Grundgerüst für spätere operative Arbeitsbereiche."
      nav={crmNavigation.employee}
    >
      <ModuleGrid
        eyebrow="Mitarbeiter"
        title="Placeholder"
        description="Hier entsteht später der eingeschränkte operative Arbeitsbereich."
        items={crmNavigation.employee}
      />
    </AppShell>
  );
}
