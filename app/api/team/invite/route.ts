import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { requireAdminUser } from '@/lib/server/adminAuth';

export const dynamic = 'force-dynamic';

type InviteBody = {
  email?: string;
  role?: 'ADMIN' | 'EMPLOYEE';
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
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

  let adminUser;
  try {
    adminUser = await requireAdminUser(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin-Rechte erforderlich.';
    return jsonError(message, message === 'Admin-Rechte erforderlich.' ? 403 : 401);
  }

  const requesterEmail = adminUser.email?.toLowerCase() || '';
  const supabaseAdmin = getSupabaseAdmin();
  const appBaseUrl = process.env.APP_BASE_URL || 'https://umzugsnetz.de';
  const redirectTo = `${appBaseUrl.replace(/\/$/, '')}/admin/einladung`;
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
    link: '/',
    is_read: false,
  }]);

  return NextResponse.json({ success: true });
}
