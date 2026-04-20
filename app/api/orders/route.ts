import { NextResponse } from 'next/server';
import { partnerMatchesOrder } from '@/lib/partnerMatching';
import { dispatchNotification } from '@/lib/server/notificationDispatch';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type OrderBody = Record<string, unknown>;

function buildPartnerMessage(order: any) {
  const serviceLabel = order.service_category === 'ENTRÜMPELUNG'
    ? 'Entruempelung'
    : order.service_category === 'FIRMENUMZUG'
      ? 'Firmenumzug'
      : 'Privatumzug';

  const from = order.von_city || 'unbekannt';
  const to = order.nach_city || 'unbekannt';

  return `Ein neuer Kundenauftrag in Ihrer Naehe: ${serviceLabel}, ${from} -> ${to}. Bitte melden Sie sich in Ihrem Partnerbereich an.`;
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  let body: OrderBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltige Anfrage.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert([{ ...body, updated_at: now }])
    .select('*')
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message || 'Kundenauftrag konnte nicht gespeichert werden.' }, { status: 500 });
  }

  await supabaseAdmin.from('notifications').insert([{
    type: 'NEW_ORDER',
    title: 'Neuer Kundenauftrag',
    message: `${order.customer_name} hat einen neuen Auftrag eingereicht.`,
    link: '/admin/dashboard/auftraege',
    is_read: false,
  }]);

  const { data: partners } = await supabaseAdmin
    .from('partners')
    .select('id, name, email, phone, regions, service, status, settings')
    .eq('status', 'ACTIVE');

  const matchedPartners = (partners || []).filter((partner) => partnerMatchesOrder(partner, order));
  let emailAttempts = 0;
  let smsAttempts = 0;

  for (const partner of matchedPartners) {
    const settings = (partner.settings || {}) as Record<string, unknown>;
    const emailEnabled = settings.emailNotif !== false && typeof partner.email === 'string' && partner.email.length > 3;
    const smsEnabled = settings.smsNotif === true;
    const smsNumber = typeof settings.smsNumber === 'string' && settings.smsNumber.trim() ? settings.smsNumber : partner.phone;
    const message = buildPartnerMessage(order);

    if (emailEnabled) {
      emailAttempts += 1;
      await dispatchNotification({
        kind: 'email',
        recipient: partner.email,
        subject: 'Neuer Kundenauftrag in Ihrer Region',
        message,
        metadata: {
          partnerId: partner.id,
          orderId: order.id,
        },
      }).catch(() => undefined);
    }

    if (smsEnabled && typeof smsNumber === 'string' && smsNumber.trim()) {
      smsAttempts += 1;
      await dispatchNotification({
        kind: 'sms',
        recipient: smsNumber,
        message,
        metadata: {
          partnerId: partner.id,
          orderId: order.id,
        },
      }).catch(() => undefined);
    }
  }

  await supabaseAdmin.from('notifications').insert([{
    type: 'ORDER_MATCHING',
    title: 'Benachrichtigungen vorbereitet',
    message: `${matchedPartners.length} Partner wurden fuer Auftrag ${order.order_number || order.id} beruecksichtigt. E-Mail: ${emailAttempts}, SMS: ${smsAttempts}.`,
    link: '/admin/dashboard/auftraege',
    is_read: false,
  }]);

  return NextResponse.json({
    success: true,
    orderId: order.id,
    matchedPartners: matchedPartners.length,
    emailAttempts,
    smsAttempts,
  });
}
