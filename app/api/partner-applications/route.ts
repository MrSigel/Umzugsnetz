import { NextResponse } from 'next/server';
import { normalizePartnerApplicationService, verifyCompanyProfile } from '@/lib/companyVerification';
import { dispatchNotification } from '@/lib/server/notificationDispatch';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type PartnerApplicationBody = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  radius?: string;
  service?: string;
  sourcePage?: string;
};

function required(value?: string) {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  let body: PartnerApplicationBody;

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
    !required(body.service) ||
    !required(body.sourcePage)
  ) {
    return NextResponse.json({ error: 'Bitte fuellen Sie alle Pflichtfelder aus.' }, { status: 400 });
  }

  const verification = await verifyCompanyProfile({
    companyName: body.companyName!,
    email: body.email!,
    phone: body.phone!,
    location: body.location!,
    website: body.website || null,
  });

  const normalizedService = normalizePartnerApplicationService(body.service!, body.sourcePage!);
  const now = new Date().toISOString();

  const { data: application, error: applicationError } = await supabaseAdmin
    .from('partner_applications')
    .insert([{
      company_name: body.companyName!.trim(),
      contact_name: body.contactName!.trim(),
      email: body.email!.trim().toLowerCase(),
      phone: body.phone!.trim(),
      location: body.location!.trim(),
      radius: body.radius?.trim() || null,
      service: normalizedService,
      source_page: body.sourcePage!.trim(),
      status: verification.status === 'VERIFIED' ? 'CONTACTED' : 'NEW',
      verification_status: verification.status,
      verification_score: verification.score,
      verification_summary: verification.summary,
      website_url: verification.websiteUrl || body.website?.trim() || null,
      website_checked_at: verification.websiteCheckedAt,
      approved_at: verification.status === 'VERIFIED' ? now : null,
      updated_at: now,
    }])
    .select('*')
    .single();

  if (applicationError || !application) {
    return NextResponse.json({ error: applicationError?.message || 'Partneranfrage konnte nicht gespeichert werden.' }, { status: 500 });
  }

  await supabaseAdmin.from('notifications').insert([{
    type: 'PARTNER_APPLICATION',
    title: verification.status === 'VERIFIED' ? 'Partnerfirma automatisch vorgeprueft' : 'Neue Partner-Anfrage eingegangen',
    message: verification.status === 'VERIFIED'
      ? `${application.company_name} wurde automatisch vorgeprueft und fuer die weitere Freischaltung vorbereitet.`
      : `${application.company_name} wurde erfasst und zur Pruefung vorgemerkt.`,
    link: '/admin/dashboard/partner',
    is_read: false,
  }]);

  return NextResponse.json({
    success: true,
    verificationStatus: verification.status,
    verificationSummary: verification.summary,
  });
}
