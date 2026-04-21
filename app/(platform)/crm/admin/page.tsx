import { AppShell } from '@/components/crm/AppShell';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminCrmPage() {
  return (
    <AppShell
      title="Admin Dashboard"
      description="Zentrale Steuerung für Partner, Leads, Zahlungen und Einstellungen."
      items={crmNavigation.admin}
    />
  );
}
