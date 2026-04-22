import { CrmRoleGate } from '@/components/crm/CrmRoleGate';

export default function PartnerCrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmRoleGate allowedRoles={['PARTNER']}>{children}</CrmRoleGate>;
}
