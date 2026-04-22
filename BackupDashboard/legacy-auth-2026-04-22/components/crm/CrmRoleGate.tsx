'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { AppRole } from '@/lib/crm/types';

type ResolveRolePayload = {
  role: AppRole;
  redirectTo: string;
  requiresPartnerOnboarding?: boolean;
};

type CrmRoleGateProps = {
  allowedRoles: AppRole[];
  children: React.ReactNode;
  requiresPartnerOnboarding?: boolean;
};

export function CrmRoleGate({ allowedRoles, children, requiresPartnerOnboarding = false }: CrmRoleGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifyAccess = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/auth/resolve-role', {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<ResolveRolePayload> & { error?: string };
      if (!response.ok || !payload.role) {
        router.replace('/login');
        return;
      }

      const role = payload.role;
      const targetPath = payload.redirectTo || '/login';
      const needsOnboarding = Boolean(payload.requiresPartnerOnboarding);

      if (!allowedRoles.includes(role)) {
        router.replace(targetPath);
        return;
      }

      if (role === 'PARTNER' && requiresPartnerOnboarding && !needsOnboarding) {
        router.replace('/crm/partner');
        return;
      }

      if (role === 'PARTNER' && !requiresPartnerOnboarding && needsOnboarding && !pathname.startsWith('/portal/onboarding/partner')) {
        router.replace('/portal/onboarding/partner');
        return;
      }

      if (mounted) {
        setAuthorized(true);
      }
    };

    void verifyAccess();

    return () => {
      mounted = false;
    };
  }, [allowedRoles, pathname, requiresPartnerOnboarding, router]);

  if (!authorized) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Zugriffsrechte werden geprueft ...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
