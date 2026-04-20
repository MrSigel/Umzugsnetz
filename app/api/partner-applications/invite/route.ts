import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type InviteBody = {
  applicationId?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeService(service?: string) {
  if (service === 'UMZUG' || service === 'ENTRÜMPELUNG' || service === 'BEIDES') {
    return service;
  }

  return 'BEIDES';
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
    return jsonError('Ungültige Anfrage.', 400);
  }

  const applicationId = body.applicationId?.trim();
  if (!applicationId) {
    return jsonError('Bitte eine Partneranfrage auswählen.', 400);
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
      return jsonError('Vollzugriff erforderlich.', 403);
    }
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: application, error: applicationError } = await supabaseAdmin
    .from('partner_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (applicationError || !application) {
    return jsonError('Partneranfrage wurde nicht gefunden.', 404);
  }

  const appBaseUrl = process.env.APP_BASE_URL || 'https://umzugsnetz.de';
  const redirectTo = `${appBaseUrl.replace(/\/$/, '')}/partners/invite`;

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(application.email, {
    redirectTo,
    data: {
      full_name: application.contact_name,
      company_name: application.company_name,
    },
  });

  if (inviteError || !inviteData?.user) {
    return jsonError(inviteError?.message || 'Einladung konnte nicht versendet werden.', 500);
  }

  const invitedUserId = inviteData.user.id;

  const { data: existingPartner } = await supabaseAdmin
    .from('partners')
    .select('id')
    .eq('user_id', invitedUserId)
    .maybeSingle();

  let partnerId = existingPartner?.id as string | undefined;

  if (!partnerId) {
    const { data: partnerRow, error: partnerError } = await supabaseAdmin
      .from('partners')
      .insert([{
        user_id: invitedUserId,
        name: application.company_name,
        email: application.email,
        phone: application.phone,
        regions: null,
        service: normalizeService(application.service),
        status: 'PENDING',
        category: 'Standard Anfragen',
        balance: 0,
      }])
      .select('id')
      .single();

    if (partnerError || !partnerRow) {
      return jsonError(partnerError?.message || 'Partnerprofil konnte nicht erstellt werden.', 500);
    }

    partnerId = partnerRow.id;
  }

  const now = new Date().toISOString();

  await supabaseAdmin
    .from('partner_applications')
    .update({
      status: 'CONTACTED',
      invite_sent_at: now,
      invite_sent_to: application.email,
      updated_at: now,
    })
    .eq('id', applicationId);

  await supabaseAdmin.from('notifications').insert([{
    type: 'PARTNER_INVITE_SENT',
    title: 'Partner-Einladung versendet',
    message: `Einladungslink wurde an ${application.email} versendet.`,
    link: '/admin/dashboard/partner',
    is_read: false,
  }]);

  return NextResponse.json({ success: true, invitedUserId, partnerId });
}
