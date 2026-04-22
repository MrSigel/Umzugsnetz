import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmployeeDashboardData } from '@/lib/server/employeeDashboard';

export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeRole(value: unknown) {
  const normalized = String(value || '').trim().toUpperCase();

  if (normalized === 'ADMIN' || normalized === 'ADMINISTRATOR') return 'ADMIN';
  if (normalized === 'DEVELOPER') return 'DEVELOPER';
  if (normalized === 'EMPLOYEE' || normalized === 'MITARBEITER') return 'EMPLOYEE';

  return null;
}

async function getSessionClient(authHeader: string) {
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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonError('Fehlende Anmeldung.', 401);
  }

  try {
    const sessionClient = await getSessionClient(authHeader);
    const { data: sessionUser, error: sessionError } = await sessionClient.auth.getUser();
    if (sessionError || !sessionUser.user) {
      return jsonError('Sitzung konnte nicht verifiziert werden.', 401);
    }

    const user = sessionUser.user;
    const metadataRole = normalizeRole(user.app_metadata?.role || user.user_metadata?.role);
    let accessRole = metadataRole;

    if (!accessRole) {
      const [{ data: roleRows }, { data: profileRow }, { data: employeeRow }, { data: teamRow }] = await Promise.all([
        sessionClient.from('user_roles').select('role_code').eq('user_id', user.id),
        sessionClient.from('profiles').select('primary_role').eq('id', user.id).maybeSingle(),
        sessionClient.from('employees').select('status').eq('user_id', user.id).maybeSingle(),
        sessionClient.from('team').select('role,status').ilike('email', user.email?.toLowerCase() || '').maybeSingle(),
      ]);

      const roleCodes = (roleRows || []).map((row) => normalizeRole(row.role_code));
      accessRole =
        roleCodes.find((value) => value === 'ADMIN' || value === 'DEVELOPER' || value === 'EMPLOYEE') ||
        normalizeRole(profileRow?.primary_role) ||
        (employeeRow?.status === 'ACTIVE' ? 'EMPLOYEE' : null) ||
        normalizeRole(teamRow?.status === 'DISABLED' ? null : teamRow?.role);
    }

    if (!accessRole || (accessRole !== 'ADMIN' && accessRole !== 'DEVELOPER' && accessRole !== 'EMPLOYEE')) {
      return jsonError('Mitarbeiterrechte erforderlich.', 403);
    }

    const payload = await getEmployeeDashboardData(user.id, user.email || null);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mitarbeiterdaten konnten nicht geladen werden.';
    return jsonError(message, 500);
  }
}
