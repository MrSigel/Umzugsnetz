import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type InviteBody = {
  email?: string;
  role?: 'ADMIN' | 'EMPLOYEE';
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonError('Fehlende Anmeldung.', 401);
  }

  let body: InviteBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungueltige Anfrage.', 400);
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';

  if (!email) {
    return jsonError('Bitte eine E-Mail-Adresse angeben.', 400);
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

  const requesterEmail = sessionUser.user.email?.toLowerCase() || '';
  const requesterIsAdmin =
    sessionUser.user.app_metadata?.role === 'admin' ||
    sessionUser.user.user_metadata?.role === 'admin';

  if (!requesterIsAdmin) {
    const { data: teamEntry } = await sessionClient
      .from('team')
      .select('role, status')
      .ilike('email', requesterEmail)
      .maybeSingle();

    if (teamEntry?.role !== 'ADMIN' || teamEntry?.status === 'DISABLED') {
      return jsonError('Admin-Rechte erforderlich.', 403);
    }
  }

  const supabaseAdmin = getSupabaseAdmin();
  const appBaseUrl = process.env.APP_BASE_URL || 'https://umzugsnetz.de';
  const redirectTo = `${appBaseUrl.replace(/\/$/, '')}/admin`;
  const now = new Date().toISOString();

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      role: role === 'ADMIN' ? 'admin' : 'employee',
      full_name: email.split('@')[0],
    },
  });

  if (inviteError) {
    return jsonError(inviteError.message || 'Einladung konnte nicht versendet werden.', 500);
  }

  const { error: teamError } = await supabaseAdmin
    .from('team')
    .upsert([{
      email,
      role,
      status: 'PENDING',
      invited_by_email: requesterEmail || null,
      invitation_sent_at: now,
    }], { onConflict: 'email' });

  if (teamError) {
    return jsonError(teamError.message || 'Teameintrag konnte nicht gespeichert werden.', 500);
  }

  await supabaseAdmin.from('notifications').insert([{
    type: 'TEAM_INVITE_SENT',
    title: 'Mitarbeiter-Einladung versendet',
    message: `${email} wurde als ${role === 'ADMIN' ? 'Administrator' : 'Mitarbeiter'} eingeladen.`,
    link: '/admin/dashboard/team',
    is_read: false,
  }]);

  return NextResponse.json({ success: true });
}
