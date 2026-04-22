import { NextResponse } from 'next/server';
import { verifyCompanyProfile } from '@/lib/companyVerification';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type RegisterBody = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  password?: string;
};

function required(value?: string) {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  let body: RegisterBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltige Anfrage.' }, { status: 400 });
  }

  if (
    !required(body.companyName) ||
    !required(body.contactName) ||
    !required(body.email) ||
    !required(body.phone) ||
    !required(body.location) ||
    !required(body.website) ||
    !required(body.password)
  ) {
    return NextResponse.json({ error: 'Bitte fuellen Sie alle Pflichtfelder aus.' }, { status: 400 });
  }

  if (body.password!.trim().length < 8) {
    return NextResponse.json({ error: 'Bitte verwenden Sie mindestens 8 Zeichen fuer das Passwort.' }, { status: 400 });
  }

  const normalizedEmail = body.email!.trim().toLowerCase();
  const now = new Date().toISOString();
  const verification = await verifyCompanyProfile({
    companyName: body.companyName!,
    email: normalizedEmail,
    phone: body.phone!,
    location: body.location!,
    website: body.website!,
  });

  const { data: application, error: applicationError } = await supabaseAdmin
    .from('partner_applications')
    .insert([{
      company_name: body.companyName!.trim(),
      contact_name: body.contactName!.trim(),
      email: normalizedEmail,
      phone: body.phone!.trim(),
      location: body.location!.trim(),
      service: 'UMZUG',
      source_page: '/login',
      status: verification.status === 'VERIFIED' ? 'COMPLETED' : 'NEW',
      verification_status: verification.status === 'VERIFIED' ? 'VERIFIED' : 'REVIEW',
      verification_score: verification.score,
      verification_summary: verification.summary,
      website_url: verification.websiteUrl || body.website!.trim(),
      website_checked_at: verification.websiteCheckedAt,
      approved_at: verification.status === 'VERIFIED' ? now : null,
      updated_at: now,
    }])
    .select('id, company_name')
    .single();

  if (applicationError || !application) {
    return NextResponse.json({ error: applicationError?.message || 'Registrierung konnte nicht gespeichert werden.' }, { status: 500 });
  }

  if (verification.status !== 'VERIFIED') {
    await supabaseAdmin.from('notifications').insert([{
      type: 'PARTNER_APPLICATION',
      title: 'Partnerregistrierung in Pruefung',
      message: `${body.companyName!.trim()} wurde erfasst und wartet auf Rueckmeldung durch das Team.`,
      link: '/admin/dashboard/partner',
      is_read: false,
    }]);

    return NextResponse.json({
      success: true,
      activated: false,
      verificationStatus: verification.status,
      verificationSummary: verification.summary,
    });
  }

  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password: body.password!.trim(),
    email_confirm: true,
    user_metadata: {
      full_name: body.contactName!.trim(),
      company_name: body.companyName!.trim(),
      phone: verification.phoneNormalized || body.phone!.trim(),
    },
  });

  if (createUserError || !createdUser.user) {
    return NextResponse.json({ error: createUserError?.message || 'Benutzerkonto konnte nicht erstellt werden.' }, { status: 500 });
  }

  await supabaseAdmin.from('profiles').upsert([{
    id: createdUser.user.id,
    full_name: body.contactName!.trim(),
    email: normalizedEmail,
    phone: verification.phoneNormalized || body.phone!.trim(),
    primary_role: 'PARTNER',
    updated_at: now,
  }], { onConflict: 'id' });

  await supabaseAdmin.from('user_roles').upsert([{
    user_id: createdUser.user.id,
    role_code: 'PARTNER',
  }], { onConflict: 'user_id,role_code' });

  const { data: partnerProfile, error: partnerProfileError } = await supabaseAdmin
    .from('partners')
    .insert([{
      user_id: createdUser.user.id,
      profile_id: createdUser.user.id,
      name: body.companyName!.trim(),
      email: normalizedEmail,
      phone: verification.phoneNormalized || body.phone!.trim(),
      regions: body.location!.trim(),
      service: 'UMZUG',
      status: 'ACTIVE',
      category: 'Standard Anfragen',
      balance: 0,
      verification_status: 'VERIFIED',
      verified_at: now,
      package_code: 'FREE',
      settings: {
        emailNotif: true,
        smsNotif: true,
        smsNumber: verification.phoneNormalized || body.phone!.trim(),
        website: verification.websiteUrl || body.website!.trim(),
      },
    }])
    .select('id')
    .single();

  if (partnerProfileError || !partnerProfile) {
    return NextResponse.json({ error: partnerProfileError?.message || 'Partnerprofil konnte nicht erstellt werden.' }, { status: 500 });
  }

  await supabaseAdmin.from('notifications').insert([{
    type: 'NEW_PARTNER',
    title: 'Partner automatisch freigeschaltet',
    message: `${body.companyName!.trim()} wurde nach erfolgreicher Pruefung automatisch aktiviert.`,
    link: '/admin/dashboard/partner',
    is_read: false,
  }]);

  return NextResponse.json({
    success: true,
    activated: true,
    partnerId: partnerProfile.id,
    verificationStatus: verification.status,
    verificationSummary: verification.summary,
  });
}
