import type { AppRole } from '@/lib/crm/types';

export const roleRedirectMap: Record<AppRole, string> = {
  ADMIN: '/crm/admin',
  DEVELOPER: '/crm/admin',
  PARTNER: '/crm/partner',
  EMPLOYEE: '/crm/employee',
};
