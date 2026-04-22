import { CrmRoleGate } from '@/components/crm/CrmRoleGate';

export default function AdminCrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmRoleGate allowedRoles={['ADMIN', 'DEVELOPER']}>{children}</CrmRoleGate>;
}
