import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeRole(value: unknown) {
  const role = String(value || '').trim().toUpperCase();
  if (role === 'ADMIN' || role === 'ADMINISTRATOR' || role === 'DEVELOPER') return 'ADMIN';
  if (role === 'EMPLOYEE' || role === 'MITARBEITER') return 'EMPLOYEE';
  if (role === 'PARTNER') return 'PARTNER';
  return null;
}

function getSessionClient(authHeader: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase-Konfiguration fehlt.');
  }

  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonError('Fehlende Anmeldung.', 401);
  }

  const sessionClient = getSessionClient(authHeader);
  const { data: sessionUser, error: sessionError } = await sessionClient.auth.getUser();
  if (sessionError || !sessionUser.user) {
    return jsonError('Sitzung konnte nicht verifiziert werden.', 401);
  }

  const user = sessionUser.user;
  const email = user.email?.toLowerCase() || '';
  const metadataRole = normalizeRole(user.app_metadata?.role || user.user_metadata?.role);
  if (metadataRole === 'ADMIN' || metadataRole === 'EMPLOYEE') {
    return NextResponse.json({ role: metadataRole, redirectTo: '/admin' });
  }

  const admin = getSupabaseAdmin();
  const [userRoles, profile, team] = await Promise.all([
    admin.from('user_roles').select('role_code').eq('user_id', user.id),
    admin.from('profiles').select('primary_role').eq('id', user.id).maybeSingle(),
    email ? admin.from('team').select('role, status').ilike('email', email).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  const explicitRole = (userRoles.data || []).reduce<string | null>((resolved, entry) => {
    if (resolved === 'ADMIN') return resolved;
    return normalizeRole(entry.role_code) || resolved;
  }, null);

  const profileRole = normalizeRole(profile.data?.primary_role);
  const teamRole = team.data?.status === 'DISABLED' ? null : normalizeRole(team.data?.role);
  const resolvedRole = teamRole || explicitRole || profileRole || metadataRole || 'PARTNER';

  let redirectTo = '/';
  if (resolvedRole === 'ADMIN' || resolvedRole === 'EMPLOYEE') {
    redirectTo = '/admin';
  } else if (resolvedRole === 'PARTNER') {
    const { data: partner } = await admin
      .from('partners')
      .select('onboarding_completed_at')
      .eq('user_id', user.id)
      .maybeSingle();
    redirectTo = partner?.onboarding_completed_at ? '/crm/partner' : '/portal/onboarding/partner';
  }

  return NextResponse.json({
    role: resolvedRole,
    redirectTo,
  });
}
