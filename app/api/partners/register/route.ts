import { NextResponse } from 'next/server';
import { verifyCompanyProfile } from '@/lib/companyVerification';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type RegisterBody = {
  fullName?: string;
  companyName?: string;
  location?: string;
  radius?: string;
  service?: string;
  email?: string;
  phone?: string;
  website?: string;
  password?: string;
};

function required(value?: string) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeWebsite(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeServiceCode(value?: string): 'UMZUG' | 'ENTRÜMPELUNG' | 'BEIDES' {
  const code = String(value || '').trim().toLowerCase();
  if (code === 'entruempelung' || code === 'entrümpelung') return 'ENTRÜMPELUNG';
  if (code === 'umzug' || code === 'privatumzug' || code === 'firmenumzug') return 'UMZUG';
  if (code === 'umzug_entruempelung' || code === 'umzug-entruempelung' || code === 'beides') return 'BEIDES';
  return 'BEIDES';
}

function parseRadiusKm(value?: string) {
  if (!value) return null;
  const match = String(value).match(/(\d+)/);
  if (!match) return null;
  const km = Number(match[1]);
  return Number.isFinite(km) && km > 0 ? km : null;
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  let body: RegisterBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  if (
    !required(body.companyName) ||
    !required(body.email) ||
    !required(body.phone) ||
    !required(body.website) ||
    !required(body.password)
  ) {
    return NextResponse.json({ error: 'Bitte füllen Sie alle Pflichtfelder aus.' }, { status: 400 });
  }

  if (String(body.password).length < 8) {
    return NextResponse.json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' }, { status: 400 });
  }

  const email = body.email!.trim().toLowerCase();
  const companyName = body.companyName!.trim();
  const fullName = body.fullName?.trim() || companyName;
  const location = body.location?.trim() || 'Nicht angegeben';
  const website = normalizeWebsite(body.website);
  const serviceCode = normalizeServiceCode(body.service);
  const radiusKm = parseRadiusKm(body.radius);
  const radiusLabel = body.radius?.trim() || (radiusKm ? `${radiusKm} km` : null);
  const now = new Date().toISOString();

  const verification = await verifyCompanyProfile({
    companyName,
    email,
    phone: body.phone!.trim(),
    location,
    website,
  });

  const meetsAutomaticApproval =
    verification.status === 'VERIFIED' &&
    Boolean(website) &&
    verification.websiteReachable;

  if (!meetsAutomaticApproval) {
    await supabaseAdmin.from('partner_applications').insert([{
      company_name: companyName,
      contact_name: fullName,
      email,
      phone: body.phone!.trim(),
      location,
      radius: radiusLabel,
      service: serviceCode,
      source_page: 'login_register',
      status: 'NEW',
      verification_status: 'REVIEW',
      verification_score: verification.score,
      verification_summary: verification.summary,
      website_url: website,
      website_checked_at: now,
      updated_at: now,
    }]);

    return NextResponse.json({
      success: true,
      activated: false,
    });
  }

  const existingUser = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (existingUser.error) {
    return NextResponse.json({ error: 'Benutzerprüfung fehlgeschlagen.' }, { status: 500 });
  }

  if (existingUser.data.users.some((user) => user.email?.toLowerCase() === email)) {
    return NextResponse.json({ error: 'Für diese E-Mail-Adresse existiert bereits ein Konto.' }, { status: 409 });
  }

  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: body.password!,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      company_name: companyName,
      phone: body.phone!.trim(),
      role: 'partner',
    },
    app_metadata: {
      role: 'PARTNER',
    },
  });

  if (createUserError || !createdUser.user) {
    return NextResponse.json({ error: createUserError?.message || 'Konto konnte nicht erstellt werden.' }, { status: 500 });
  }

  const userId = createdUser.user.id;

  await supabaseAdmin.from('profiles').upsert([{
    id: userId,
    full_name: fullName,
    email,
    phone: body.phone!.trim(),
    primary_role: 'PARTNER',
    updated_at: now,
  }], { onConflict: 'id' });

  await supabaseAdmin.from('user_roles').upsert([{
    user_id: userId,
    role_code: 'PARTNER',
  }], { onConflict: 'user_id,role_code' });

  const { data: existingPartner } = await supabaseAdmin
    .from('partners')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const partnerPayload = {
    user_id: userId,
    profile_id: userId,
    name: companyName,
    email,
    phone: body.phone!.trim(),
    regions: location,
    service: serviceCode,
    status: 'ACTIVE',
    verification_status: 'VERIFIED',
    package_code: 'FREE',
    category: 'Standard Anfragen',
    balance: 0,
    website_url: website,
    verified_at: now,
    settings: {
      emailNotif: true,
      smsNotif: true,
      smsNumber: body.phone!.trim(),
      radius_km: radiusKm,
      radius_label: radiusLabel,
    },
    updated_at: now,
  };

  const { error: partnerError } = existingPartner
    ? await supabaseAdmin.from('partners').update(partnerPayload).eq('id', existingPartner.id)
    : await supabaseAdmin.from('partners').insert([partnerPayload]);

  if (partnerError) {
    return NextResponse.json({ error: partnerError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    activated: true,
  });
}
