import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, payload: Record<string, unknown>, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    },
  });
}

function generateInviteCode() {
  return (globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 8) || Math.random().toString(36).slice(2, 10)).toUpperCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST, OPTIONS' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: 'Supabase environment variables are missing.' });
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(401, { error: 'Missing Authorization header.' });
  }

  const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://umzugsnetz.de';

  let applicationId: string | undefined;
  try {
    const body = await req.json();
    applicationId = body?.applicationId;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  if (!applicationId) {
    return jsonResponse(400, { error: 'Missing applicationId.' });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse(401, { error: 'Invalid session.' });
  }

  const isAdmin = userData.user.app_metadata?.role === 'admin' || userData.user.user_metadata?.role === 'admin';
  if (!isAdmin) {
    return jsonResponse(403, { error: 'Admin access required.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: application, error: applicationError } = await supabaseAdmin
    .from('partner_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (applicationError || !application) {
    return jsonResponse(404, { error: 'Partner application not found.' });
  }

  const inviteRedirectTo = `${appBaseUrl.replace(/\\/$/, '')}/partners/invite`;

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(application.email, {
    redirectTo: inviteRedirectTo,
    data: {
      full_name: application.contact_name,
      company_name: application.company_name,
    },
  });

  if (inviteError || !inviteData?.user) {
    return jsonResponse(500, { error: inviteError?.message || 'Supabase invite could not be created.' });
  }

  const invitedUserId = inviteData.user.id;

  // Ensure partner profile exists for invited auth user.
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
        service: application.service === 'UMZUG' || application.service === 'ENTRÜMPELUNG' || application.service === 'BEIDES' ? application.service : 'BEIDES',
        status: 'PENDING',
        category: 'Standard Anfragen',
        balance: 0,
      }])
      .select('id')
      .single();

    if (partnerError || !partnerRow) {
      return jsonResponse(500, { error: partnerError?.message || 'Partner profile could not be created.' });
    }

    partnerId = partnerRow.id;
  }

  await supabaseAdmin
    .from('partner_applications')
    .update({
      status: 'CONTACTED',
      invite_sent_at: new Date().toISOString(),
      invite_sent_to: application.email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  await supabaseAdmin.from('notifications').insert([{
    type: 'PARTNER_INVITE_SENT',
    title: 'Partner-Einladung versendet',
    message: `Supabase Invite-Link wurde an ${application.email} versendet.`,
    link: '/admin/dashboard/partner',
    is_read: false,
  }]);

  return jsonResponse(200, { success: true, invitedUserId, partnerId });
});
