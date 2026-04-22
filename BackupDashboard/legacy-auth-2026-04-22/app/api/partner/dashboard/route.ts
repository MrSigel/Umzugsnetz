import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPartnerDashboardData } from '@/lib/server/partnerDashboard';

export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getSessionUser(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { error: jsonError('Fehlende Anmeldung.', 401), user: null as null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { error: jsonError('Supabase-Konfiguration fehlt.', 500), user: null as null };
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

  const { data, error } = await sessionClient.auth.getUser();
  if (error || !data.user) {
    return { error: jsonError('Sitzung konnte nicht verifiziert werden.', 401), user: null as null };
  }

  return { error: null, user: data.user };
}

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (session.error || !session.user) {
    return session.error!;
  }

  try {
    const payload = await getPartnerDashboardData(session.user.id);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Partnerdaten konnten nicht geladen werden.';
    return jsonError(message, message === 'Partnerprofil wurde nicht gefunden.' ? 404 : 500);
  }
}
