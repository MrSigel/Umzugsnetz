import { AppShell } from '@/components/crm/AppShell';
import { AdminUserRoleManager } from '@/components/crm/AdminUserRoleManager';
import { crmNavigation } from '@/lib/crm/navigation';

export default function AdminUsersPage() {
  return (
    <AppShell title="Admin Dashboard" description="Benutzerverwaltung und Rollenzuweisung." nav={crmNavigation.admin}>
      <AdminUserRoleManager />
    </AppShell>
  );
}
