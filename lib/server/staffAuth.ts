import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export type StaffRole = 'ADMIN' | 'EMPLOYEE';

export type StaffUser = {
  user: User;
  role: StaffRole;
  client: SupabaseClient;
};

function normalizeStaffRole(value: unknown): StaffRole | null {
  const role = String(value || '').trim().toUpperCase();

  if (role === 'ADMIN' || role === 'ADMINISTRATOR' || role === 'DEVELOPER') return 'ADMIN';
  if (role === 'EMPLOYEE' || role === 'MITARBEITER') return 'EMPLOYEE';

  return null;
}

function getSessionClient(authHeader: string) {
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

export async function requireStaffUser(request: Request, minimumRole: StaffRole = 'EMPLOYEE'): Promise<StaffUser> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('Fehlende Anmeldung.');
  }

  const sessionClient = getSessionClient(authHeader);
  const { data: sessionUser, error: sessionError } = await sessionClient.auth.getUser();
  if (sessionError || !sessionUser.user) {
    throw new Error('Sitzung konnte nicht verifiziert werden.');
  }

  const user = sessionUser.user;
  const email = user.email?.toLowerCase() || '';
  const metadataRole = normalizeStaffRole(user.app_metadata?.role || user.user_metadata?.role);

  if (metadataRole === 'ADMIN') {
    return { user, role: 'ADMIN', client: sessionClient };
  }

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('primary_role')
    .eq('id', user.id)
    .maybeSingle();
  const profileRole = normalizeStaffRole(profile?.primary_role);

  if (profileRole === 'ADMIN') {
    return { user, role: 'ADMIN', client: sessionClient };
  }

  if (!email) {
    throw new Error('Mitarbeiter-Rechte erforderlich.');
  }

  const { data: teamEntry } = await sessionClient
    .from('team')
    .select('role, status')
    .ilike('email', email)
    .maybeSingle();

  if (teamEntry?.status === 'DISABLED') {
    throw new Error('Nutzer ist gesperrt.');
  }

  const teamRole = normalizeStaffRole(teamEntry?.role);
  const resolvedRole = teamRole || profileRole || metadataRole;

  if (resolvedRole === 'ADMIN') {
    return { user, role: 'ADMIN', client: sessionClient };
  }

  if (resolvedRole === 'EMPLOYEE' && minimumRole === 'EMPLOYEE') {
    return { user, role: 'EMPLOYEE', client: sessionClient };
  }

  throw new Error(minimumRole === 'ADMIN' ? 'Admin-Rechte erforderlich.' : 'Mitarbeiter-Rechte erforderlich.');
}
