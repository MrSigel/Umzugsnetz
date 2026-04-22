import { CrmRoleGate } from '@/components/crm/CrmRoleGate';

export default function EmployeeCrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmRoleGate allowedRoles={['ADMIN', 'DEVELOPER', 'EMPLOYEE']}>{children}</CrmRoleGate>;
}
