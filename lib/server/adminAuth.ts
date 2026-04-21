import { createClient, type User } from '@supabase/supabase-js';

function normalizeInternalRole(value: unknown) {
  const normalized = String(value || '').trim().toUpperCase();

  if (normalized === 'ADMIN' || normalized === 'ADMINISTRATOR') {
    return 'ADMIN';
  }

  if (normalized === 'DEVELOPER') {
    return 'DEVELOPER';
  }

  if (normalized === 'EMPLOYEE' || normalized === 'MITARBEITER') {
    return 'EMPLOYEE';
  }

  return null;
}

function getSupabaseSessionClient(authHeader: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase-Konfiguration fehlt.');
  }

  return createClient(supabaseUrl, anonKey, {
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
}

export async function requireAdminUser(request: Request): Promise<User> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('Fehlende Anmeldung.');
  }

  const sessionClient = getSupabaseSessionClient(authHeader);
  const { data: sessionUser, error: sessionError } = await sessionClient.auth.getUser();
  if (sessionError || !sessionUser.user) {
    throw new Error('Sitzung konnte nicht verifiziert werden.');
  }

  const user = sessionUser.user;
  const requesterEmail = user.email?.toLowerCase() || '';
  const requesterIsAdmin =
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin';

  if (requesterIsAdmin) {
    return user;
  }

  const { data: ownRoles } = await sessionClient
    .from('user_roles')
    .select('role_code')
    .eq('user_id', user.id);

  const hasAdminRole = (ownRoles || []).some((entry) => {
    const role = normalizeInternalRole(entry.role_code);
    return role === 'ADMIN' || role === 'DEVELOPER';
  });
  if (hasAdminRole) {
    return user;
  }

  const { data: ownProfile } = await sessionClient
    .from('profiles')
    .select('primary_role')
    .eq('id', user.id)
    .maybeSingle();

  const profileRole = normalizeInternalRole(ownProfile?.primary_role);
  if (profileRole === 'ADMIN' || profileRole === 'DEVELOPER') {
    return user;
  }

  const { data: teamEntry } = await sessionClient
    .from('team')
    .select('role, status')
    .ilike('email', requesterEmail)
    .maybeSingle();

  const teamRole = normalizeInternalRole(teamEntry?.role);
  if ((teamRole !== 'ADMIN' && teamRole !== 'DEVELOPER') || teamEntry?.status === 'DISABLED') {
    throw new Error('Admin-Rechte erforderlich.');
  }

  return user;
}
