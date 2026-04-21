import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { roleRedirectMap } from '@/lib/auth/roles';
import { bootstrapPartnerUser } from '@/lib/auth/bootstrapPartnerUser';
import type { AppRole } from '@/lib/crm/types';

export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonError('Fehlende Anmeldung.', 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return jsonError('Supabase-Konfiguration fehlt.', 500);
  }

  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: sessionUser, error: sessionError } = await sessionClient.auth.getUser();
  if (sessionError || !sessionUser.user) {
    return jsonError('Sitzung konnte nicht verifiziert werden.', 401);
  }

  const user = sessionUser.user;
  const supabaseAdmin = getSupabaseAdmin();

  const [{ data: roleRows }, { data: partnerRow }, { data: profileRow }] = await Promise.all([
    supabaseAdmin
      .from('user_roles')
      .select('role_code')
      .eq('user_id', user.id),
    supabaseAdmin
      .from('partners')
      .select('id, onboarding_completed_at, verification_status')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('profiles')
      .select('onboarding_completed_at, primary_role')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  let role = roleRows?.[0]?.role_code as AppRole | undefined;

  if (!role) {
    const metadataRole = String(
      user.app_metadata?.role || user.user_metadata?.role || profileRow?.primary_role || '',
    ).toUpperCase();

    if (metadataRole === 'ADMIN' || metadataRole === 'DEVELOPER' || metadataRole === 'PARTNER' || metadataRole === 'EMPLOYEE') {
      role = metadataRole as AppRole;
    } else if (partnerRow) {
      role = 'PARTNER';
    }
  }

  if (!role) {
    const looksLikePartner =
      String(user.app_metadata?.role || user.user_metadata?.role || '').toUpperCase() === 'PARTNER'
      || Boolean(partnerRow);

    if (looksLikePartner) {
      await bootstrapPartnerUser(user);

      const [{ data: repairedRoleRows }, { data: repairedPartnerRow }, { data: repairedProfileRow }] = await Promise.all([
        supabaseAdmin
          .from('user_roles')
          .select('role_code')
          .eq('user_id', user.id),
        supabaseAdmin
          .from('partners')
          .select('id, onboarding_completed_at, verification_status')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabaseAdmin
          .from('profiles')
          .select('onboarding_completed_at, primary_role')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      role = repairedRoleRows?.[0]?.role_code as AppRole | undefined;

      if (!role && repairedPartnerRow) {
        role = 'PARTNER';
      }

      if (role) {
        return NextResponse.json({
          role,
          redirectTo:
            role === 'PARTNER'
            && !repairedPartnerRow?.onboarding_completed_at
            && !repairedProfileRow?.onboarding_completed_at
              ? '/portal/onboarding/partner'
              : roleRedirectMap[role],
          requiresPartnerOnboarding:
            role === 'PARTNER'
            && !repairedPartnerRow?.onboarding_completed_at
            && !repairedProfileRow?.onboarding_completed_at,
          verificationStatus: repairedPartnerRow?.verification_status || null,
        });
      }
    }
  }

  if (!role) {
    return jsonError('Keine Rolle zugewiesen.', 403);
  }

  const requiresPartnerOnboarding =
    role === 'PARTNER' &&
    !partnerRow?.onboarding_completed_at &&
    !profileRow?.onboarding_completed_at;

  return NextResponse.json({
    role,
    redirectTo: requiresPartnerOnboarding ? '/portal/onboarding/partner' : roleRedirectMap[role],
    requiresPartnerOnboarding,
    verificationStatus: partnerRow?.verification_status || null,
  });
}
