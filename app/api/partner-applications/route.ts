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
      website_url: verification.websiteUrl,
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

  let inviteSent = false;
  if (verification.status === 'VERIFIED') {
    const appBaseUrl = process.env.APP_BASE_URL || 'https://umzugsnetz.de';
    const redirectTo = `${appBaseUrl.replace(/\/$/, '')}/partners/invite`;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(application.email, {
      redirectTo,
      data: {
        full_name: application.contact_name,
        company_name: application.company_name,
      },
    });

    if (!inviteError && inviteData?.user) {
      inviteSent = true;

      const { data: existingPartner } = await supabaseAdmin
        .from('partners')
        .select('id')
        .eq('user_id', inviteData.user.id)
        .maybeSingle();

      if (!existingPartner) {
        await supabaseAdmin.from('partners').insert([{
          user_id: inviteData.user.id,
          name: application.company_name,
          email: application.email,
          phone: application.phone,
          service: application.service,
          status: 'PENDING',
          category: 'Standard Anfragen',
          balance: 0,
          settings: {
            emailNotif: true,
            smsNotif: true,
            smsNumber: application.phone,
          },
        }]);
      }

      await supabaseAdmin
        .from('partner_applications')
        .update({
          invite_sent_at: now,
          invite_sent_to: application.email,
          updated_at: now,
        })
        .eq('id', application.id);

      await supabaseAdmin.from('notifications').insert([{
        type: 'PARTNER_INVITE_SENT',
        title: 'Freischaltung vorbereitet',
        message: `Die Einladung fuer ${application.company_name} wurde automatisch an ${application.email} versendet.`,
        link: '/admin/dashboard/partner',
        is_read: false,
      }]);

      await dispatchNotification({
        kind: 'email',
        recipient: application.email,
        subject: 'Ihre Freischaltung bei Umzugsnetz',
        message: 'Ihre Partneranfrage wurde erfolgreich vorgeprueft. Bitte schliessen Sie jetzt Ihre Freischaltung ueber den Einladungslink ab.',
        metadata: {
          applicationId: application.id,
          companyName: application.company_name,
        },
      }).catch(() => undefined);
    }
  }

  return NextResponse.json({
    success: true,
    verificationStatus: verification.status,
    verificationSummary: verification.summary,
    inviteSent,
  });
}
