import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCompanyProfile } from '@/lib/companyVerification';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type OnboardingBody = {
  companyName?: string;
  fullName?: string;
  phone?: string;
  websiteUrl?: string;
  city?: string;
  postalCode?: string;
  radiusKm?: number;
  services?: string[];
};

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

  const supabaseAdmin = getSupabaseAdmin();
  const userId = session.user.id;

  const [{ data: partner }, { data: profile }, { data: regionRows }, { data: serviceRows }] = await Promise.all([
    supabaseAdmin
      .from('partners')
      .select('id,name,phone,email,website_url,verification_status,onboarding_completed_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('profiles')
      .select('full_name,phone')
      .eq('id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('service_regions')
      .select('city,postal_code,radius_km')
      .eq('partner_id', userId)
      .limit(1),
    supabaseAdmin
      .from('partner_services')
      .select('service_code')
      .eq('partner_id', userId),
  ]);

  const region = regionRows?.[0];

  return NextResponse.json({
    companyName: partner?.name || '',
    fullName: profile?.full_name || '',
    phone: profile?.phone || partner?.phone || '',
    websiteUrl: partner?.website_url || '',
    city: region?.city || '',
    postalCode: region?.postal_code || '',
    radiusKm: region?.radius_km || 50,
    services: serviceRows?.map((entry) => entry.service_code) || [],
    verificationStatus: partner?.verification_status || 'PENDING',
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (session.error || !session.user) {
    return session.error!;
  }

  let body: OnboardingBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungültige Anfrage.', 400);
  }

  const companyName = body.companyName?.trim();
  const fullName = body.fullName?.trim();
  const phone = body.phone?.trim();
  const websiteUrl = body.websiteUrl?.trim() || null;
  const city = body.city?.trim();
  const postalCode = body.postalCode?.trim() || null;
  const radiusKm = Number(body.radiusKm || 0);
  const services = Array.isArray(body.services) ? body.services.filter(Boolean) : [];

  if (!companyName || !fullName || !phone || !city || services.length === 0) {
    return jsonError('Bitte alle Pflichtfelder ausfüllen.', 400);
  }

  const user = session.user;
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return jsonError('Benutzerkonto ohne E-Mail-Adresse.', 400);
  }

  const verification = await verifyCompanyProfile({
    companyName,
    email,
    phone,
    location: city,
  });

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const verificationStatus = verification.status === 'VERIFIED' ? 'VERIFIED' : 'MANUAL_REVIEW';
  const partnerStatus = 'ACTIVE';

  const { data: partner, error: partnerError } = await supabaseAdmin
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (partnerError || !partner) {
    return jsonError('Partnerprofil wurde nicht gefunden.', 404);
  }

  await supabaseAdmin.from('profiles').upsert([{
    id: user.id,
    full_name: fullName,
    email,
    phone,
    primary_role: 'PARTNER',
    onboarding_completed_at: now,
    updated_at: now,
  }], { onConflict: 'id' });

  const { error: updatePartnerError } = await supabaseAdmin
    .from('partners')
    .update({
      profile_id: user.id,
      name: companyName,
      email,
      phone,
      website_url: websiteUrl ?? verification.websiteUrl,
      verification_status: verificationStatus,
      status: partnerStatus,
      onboarding_completed_at: now,
      verified_at: verificationStatus === 'VERIFIED' ? now : null,
      updated_at: now,
    })
    .eq('id', partner.id);

  if (updatePartnerError) {
    return jsonError(updatePartnerError.message, 500);
  }

  await supabaseAdmin.from('service_regions').delete().eq('partner_id', partner.id);
  await supabaseAdmin.from('partner_services').delete().eq('partner_id', partner.id);

  await supabaseAdmin.from('service_regions').insert([{
    partner_id: partner.id,
    postal_code: postalCode,
    city,
    radius_km: radiusKm > 0 ? radiusKm : 50,
  }]);

  await supabaseAdmin.from('partner_services').insert(
    services.map((serviceCode) => ({
      partner_id: partner.id,
      service_code: serviceCode,
      is_active: true,
    })),
  );

  await supabaseAdmin.from('partner_verification_scores').insert([{
    partner_id: partner.id,
    company_name_score: companyName.length >= 4 ? 25 : 0,
    location_score: city.length >= 2 ? 20 : 0,
    email_domain_score: verification.summary.includes('Unternehmensdomain vorhanden') ? 25 : 0,
    phone_score: verification.phoneNormalized ? 20 : 0,
    website_score: verification.websiteReachable ? 30 : 0,
    total_score: verification.score,
  }]);

  return NextResponse.json({
    success: true,
    redirectTo: '/partner',
    verificationStatus,
    verificationSummary: verification.summary,
  });
}
