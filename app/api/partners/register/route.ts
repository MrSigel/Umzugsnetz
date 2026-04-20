import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type RegisterBody = {
  userId?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  inviteCode?: string;
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
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  if (
    !required(body.userId) ||
    !required(body.companyName) ||
    !required(body.email) ||
    !required(body.phone) ||
    !required(body.inviteCode)
  ) {
    return NextResponse.json({ error: 'Bitte füllen Sie alle Pflichtfelder aus.' }, { status: 400 });
  }

  const userId = body.userId!.trim();
  const normalizedEmail = body.email!.trim().toLowerCase();
  const normalizedCode = body.inviteCode!.trim().toUpperCase();

  const [{ data: authUserData, error: authUserError }, { data: inviteCode, error: inviteCodeError }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin
      .from('partner_invite_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_used', false)
      .single(),
  ]);

  if (authUserError || !authUserData.user) {
    return NextResponse.json({ error: 'Benutzerkonto konnte nicht geprüft werden.' }, { status: 400 });
  }

  if (inviteCodeError || !inviteCode) {
    return NextResponse.json({ error: 'Ungültiger oder bereits verwendeter Einmalcode.' }, { status: 400 });
  }

  const { data: existingPartner } = await supabaseAdmin
    .from('partners')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  let partnerId = existingPartner?.id || null;

  if (!existingPartner) {
    const { data: partnerProfile, error: profileError } = await supabaseAdmin
      .from('partners')
      .insert([{
        user_id: userId,
        name: body.companyName!.trim(),
        email: normalizedEmail,
        phone: body.phone!.trim(),
        status: 'PENDING',
        category: 'Standard Anfragen',
        balance: 0,
        settings: {
          emailNotif: true,
          smsNotif: true,
          smsNumber: body.phone!.trim(),
        },
      }])
      .select('id')
      .single();

    if (profileError || !partnerProfile) {
      return NextResponse.json({ error: profileError?.message || 'Profil konnte nicht erstellt werden.' }, { status: 500 });
    }

    partnerId = partnerProfile.id;
  }

  const { error: inviteUpdateError } = await supabaseAdmin
    .from('partner_invite_codes')
    .update({ is_used: true, used_by: partnerId })
    .eq('id', inviteCode.id);

  if (inviteUpdateError) {
    return NextResponse.json({ error: inviteUpdateError.message }, { status: 500 });
  }

  await supabaseAdmin.from('notifications').insert([{
    type: 'NEW_PARTNER',
    title: 'Neue Partner-Registrierung',
    message: `${body.companyName!.trim()} hat sich als Partner registriert und wartet auf Freischaltung.`,
    link: '/admin/dashboard/partner',
    is_read: false,
  }]);

  return NextResponse.json({
    success: true,
    partnerId,
  });
}
