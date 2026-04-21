import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { roleRedirectMap } from '@/lib/auth/roles';
import { bootstrapPartnerUser } from '@/lib/auth/bootstrapPartnerUser';
import type { AppRole } from '@/lib/crm/types';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isAppRole(value: string): value is AppRole {
  return value === 'ADMIN' || value === 'DEVELOPER' || value === 'PARTNER' || value === 'EMPLOYEE';
}

function pickHighestRole(roles: string[]): AppRole | undefined {
  const normalized = roles.filter(isAppRole);
  if (normalized.includes('ADMIN')) return 'ADMIN';
  if (normalized.includes('DEVELOPER')) return 'DEVELOPER';
  if (normalized.includes('EMPLOYEE')) return 'EMPLOYEE';
  if (normalized.includes('PARTNER')) return 'PARTNER';
  return undefined;
}

export async function GET(request: Request) {
  try {
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

    let role = pickHighestRole((roleRows || []).map((row) => String(row.role_code || '')));
    const metadataRole = String(
      user.app_metadata?.role || user.user_metadata?.role || profileRow?.primary_role || '',
    ).toUpperCase();

    if (!role && isAppRole(metadataRole)) {
      role = metadataRole;
    } else if (!role && partnerRow) {
      role = 'PARTNER';
    }

    if (!role && metadataRole === 'PARTNER') {
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

      role = pickHighestRole((repairedRoleRows || []).map((row) => String(row.role_code || '')));

      if (!role && repairedPartnerRow) {
        role = 'PARTNER';
      }

      if (role) {
        const requiresPartnerOnboarding =
          !repairedPartnerRow?.onboarding_completed_at &&
          !repairedProfileRow?.onboarding_completed_at;

        return NextResponse.json({
          role,
          redirectTo: requiresPartnerOnboarding ? '/portal/onboarding/partner' : roleRedirectMap[role],
          requiresPartnerOnboarding,
          verificationStatus: repairedPartnerRow?.verification_status || null,
        });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rolle konnte nicht ermittelt werden.';
    return jsonError(message, 500);
  }
}
