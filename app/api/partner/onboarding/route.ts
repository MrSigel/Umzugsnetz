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
  serviceMode?: 'UMZUG' | 'ENTRUEMPELUNG' | 'BEIDES';
};

function deriveServiceMode(services: string[]): 'UMZUG' | 'ENTRÜMPELUNG' | 'BEIDES' {
  const codes = new Set(services.map((value) => String(value || '').toUpperCase()));
  if (codes.has('BEIDES')) return 'BEIDES';
  const hasUmzug = codes.has('UMZUG');
  const hasEntr = codes.has('ENTRUEMPELUNG') || codes.has('ENTRÜMPELUNG');
  if (hasUmzug && hasEntr) return 'BEIDES';
  if (hasEntr) return 'ENTRÜMPELUNG';
  return 'UMZUG';
}

function expandServiceMode(mode: 'UMZUG' | 'ENTRÜMPELUNG' | 'BEIDES'): string[] {
  if (mode === 'BEIDES') return ['UMZUG', 'ENTRUEMPELUNG'];
  if (mode === 'ENTRÜMPELUNG') return ['ENTRUEMPELUNG'];
  return ['UMZUG'];
}

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

  const { data: partner } = await supabaseAdmin
    .from('partners')
    .select('id,name,phone,email,website_url,verification_status,onboarding_completed_at,service,settings')
    .eq('user_id', userId)
    .maybeSingle();

  const partnerId = partner?.id || null;

  const [{ data: profile }, regionResult, serviceResult] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('full_name,phone')
      .eq('id', userId)
      .maybeSingle(),
    partnerId
      ? supabaseAdmin
          .from('service_regions')
          .select('city,postal_code,radius_km')
          .eq('partner_id', partnerId)
          .order('created_at', { ascending: true })
          .limit(1)
      : Promise.resolve({ data: [] as Array<{ city?: string; postal_code?: string; radius_km?: number }> }),
    partnerId
      ? supabaseAdmin
          .from('partner_services')
          .select('service_code')
          .eq('partner_id', partnerId)
      : Promise.resolve({ data: [] as Array<{ service_code: string }> }),
  ]);

  const regionRows = (regionResult as { data?: Array<{ city?: string; postal_code?: string; radius_km?: number }> }).data || [];
  const serviceRows = (serviceResult as { data?: Array<{ service_code: string }> }).data || [];
  const region = regionRows[0];
  const settings = (partner?.settings && typeof partner.settings === 'object'
    ? partner.settings as Record<string, unknown>
    : {});
  const settingsRadius = Number(settings.radius_km);
  const services = serviceRows.map((entry) => entry.service_code);
  const serviceMode = (() => {
    const stored = String(partner?.service || '').toUpperCase();
    if (stored === 'BEIDES' || stored === 'UMZUG' || stored === 'ENTRÜMPELUNG' || stored === 'ENTRUEMPELUNG') {
      return stored === 'ENTRÜMPELUNG' || stored === 'ENTRUEMPELUNG' ? 'ENTRUEMPELUNG' : stored;
    }
    return deriveServiceMode(services) === 'ENTRÜMPELUNG' ? 'ENTRUEMPELUNG' : deriveServiceMode(services);
  })();

  return NextResponse.json({
    companyName: partner?.name || '',
    fullName: profile?.full_name || '',
    phone: profile?.phone || partner?.phone || '',
    websiteUrl: partner?.website_url || '',
    city: region?.city || '',
    postalCode: region?.postal_code || '',
    radiusKm: Number.isFinite(settingsRadius) && settingsRadius > 0 ? settingsRadius : (region?.radius_km || 50),
    services,
    serviceMode,
    verificationStatus: partner?.verification_status || 'PENDING',
    onboardingCompletedAt: partner?.onboarding_completed_at || null,
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
  const radiusKmInput = Number(body.radiusKm || 0);
  const radiusKm = Number.isFinite(radiusKmInput) && radiusKmInput > 0 ? radiusKmInput : 50;
  const incomingServices = Array.isArray(body.services) ? body.services.filter(Boolean) : [];
  const requestedMode = body.serviceMode
    ? (String(body.serviceMode).toUpperCase() === 'ENTRUEMPELUNG' ? 'ENTRÜMPELUNG' : (String(body.serviceMode).toUpperCase() as 'UMZUG' | 'ENTRÜMPELUNG' | 'BEIDES'))
    : null;
  const serviceMode = requestedMode || deriveServiceMode(incomingServices);
  const services = expandServiceMode(serviceMode);

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
  const userCreatedAt = user.created_at ? new Date(user.created_at).getTime() : Date.now();
  const userEmailConfirmedAt = user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : null;
  const accountAgeMinutes = (Date.now() - userCreatedAt) / 60000;
  const emailConfirmed = userEmailConfirmedAt !== null;
  const verificationStatus =
    verification.status === 'VERIFIED' || (emailConfirmed && accountAgeMinutes >= 10)
      ? 'VERIFIED'
      : 'MANUAL_REVIEW';
  const partnerStatus = 'ACTIVE';

  const { data: partner, error: partnerError } = await supabaseAdmin
    .from('partners')
    .select('id,settings')
    .eq('user_id', user.id)
    .single();

  if (partnerError || !partner) {
    return jsonError('Partnerprofil wurde nicht gefunden.', 404);
  }

  const existingSettings = (partner.settings && typeof partner.settings === 'object'
    ? partner.settings as Record<string, unknown>
    : {});
  const mergedSettings = {
    ...existingSettings,
    radius_km: radiusKm,
    radius_label: `${radiusKm} km`,
  };

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
      regions: city,
      service: serviceMode,
      website_url: websiteUrl ?? verification.websiteUrl,
      verification_status: verificationStatus,
      status: partnerStatus,
      onboarding_completed_at: now,
      verified_at: verificationStatus === 'VERIFIED' ? now : null,
      settings: mergedSettings,
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
    redirectTo: '/crm/partner',
    verificationStatus,
    verificationSummary: verification.summary,
  });
}
