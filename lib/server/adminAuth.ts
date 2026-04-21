import { createClient, type User } from '@supabase/supabase-js';

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

  const hasAdminRole = (ownRoles || []).some((entry) => entry.role_code === 'ADMIN' || entry.role_code === 'DEVELOPER');
  if (hasAdminRole) {
    return user;
  }

  const { data: teamEntry } = await sessionClient
    .from('team')
    .select('role, status')
    .ilike('email', requesterEmail)
    .maybeSingle();

  if (teamEntry?.role !== 'ADMIN' || teamEntry?.status === 'DISABLED') {
    throw new Error('Admin-Rechte erforderlich.');
  }

  return user;
}
