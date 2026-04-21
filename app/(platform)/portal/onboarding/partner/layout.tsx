import { CrmRoleGate } from '@/components/crm/CrmRoleGate';

export default function PartnerOnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrmRoleGate allowedRoles={['PARTNER']} requiresPartnerOnboarding>
      {children}
    </CrmRoleGate>
  );
}
