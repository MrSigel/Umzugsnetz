import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/server/stripe';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SubscriptionStatus = 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED' | 'EXPIRED';

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'paused':
      return 'PAUSED';
    case 'canceled':
      return 'CANCELED';
    case 'incomplete':
    case 'incomplete_expired':
      return status === 'incomplete_expired' ? 'EXPIRED' : 'INCOMPLETE';
    default:
      return 'INCOMPLETE';
  }
}

function deriveActivePackage(status: SubscriptionStatus, packageCode: string | null): 'FREE' | 'PREMIUM' | 'BUSINESS' {
  if (!packageCode) return 'FREE';
  if (status === 'ACTIVE' || status === 'PAST_DUE') {
    if (packageCode === 'PREMIUM' || packageCode === 'BUSINESS') return packageCode;
  }
  return 'FREE';
}

function isoOrNull(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function upsertSubscription(
  subscription: Stripe.Subscription,
  partnerIdHint?: string,
  packageCodeHint?: string,
) {
  const admin = getSupabaseAdmin();
  const metadataPartnerId =
    (subscription.metadata?.partner_id as string | undefined)
    || partnerIdHint
    || null;
  const metadataPackage =
    (subscription.metadata?.package_code as string | undefined)
    || packageCodeHint
    || null;

  let partnerId = metadataPartnerId;
  if (!partnerId) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    if (customerId) {
      const { data: byCustomer } = await admin
        .from('partners')
        .select('id')
        .filter('settings->>stripe_customer_id', 'eq', customerId)
        .maybeSingle();
      partnerId = byCustomer?.id || null;
    }
  }

  if (!partnerId) return;

  const status = mapStatus(subscription.status);
  const packageCode = metadataPackage && ['FREE', 'PREMIUM', 'BUSINESS'].includes(metadataPackage)
    ? metadataPackage
    : 'PREMIUM';

  const subscriptionWithPeriod = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const periodStart = subscriptionWithPeriod.current_period_start
    ?? subscription.items?.data?.[0]?.current_period_start
    ?? null;
  const periodEnd = subscriptionWithPeriod.current_period_end
    ?? subscription.items?.data?.[0]?.current_period_end
    ?? null;

  await admin.from('subscriptions').upsert(
    [{
      partner_id: partnerId,
      package_code: packageCode,
      provider: 'STRIPE',
      external_reference: subscription.id,
      status,
      current_period_start: isoOrNull(periodStart),
      current_period_end: isoOrNull(periodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    }],
    { onConflict: 'external_reference' },
  );

  const activePackage = deriveActivePackage(status, packageCode);
  await admin
    .from('partners')
    .update({ package_code: activePackage, updated_at: new Date().toISOString() })
    .eq('id', partnerId);
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe-Webhook ist nicht konfiguriert.' }, { status: 503 });
  }

  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Stripe nicht konfiguriert.' }, { status: 503 });
  }

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signaturprüfung fehlgeschlagen.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await upsertSubscription(subscription, session.metadata?.partner_id, session.metadata?.package_code);
          }
        } else if (session.mode === 'payment' && session.metadata?.type === 'wallet_topup') {
          if (session.payment_status === 'paid') {
            await applyWalletTopup(session);
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(subscription);
        break;
      }
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        if (intent.metadata?.type === 'wallet_topup') {
          await applyWalletTopupFromIntent(intent);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook-Verarbeitung fehlgeschlagen.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function applyWalletTopup(session: Stripe.Checkout.Session) {
  const partnerId = session.metadata?.partner_id || null;
  const amountCents = session.amount_total ?? Number(session.metadata?.amount_cents || 0);
  if (!partnerId || !amountCents || amountCents <= 0) return;

  await creditPartnerWallet({
    partnerId,
    amount: amountCents / 100,
    reference: session.metadata?.reference || `STRIPE-${session.id}`,
    note: session.metadata?.note || null,
    externalId: session.id,
  });
}

async function applyWalletTopupFromIntent(intent: Stripe.PaymentIntent) {
  const partnerId = intent.metadata?.partner_id || null;
  const amountCents = intent.amount_received || Number(intent.metadata?.amount_cents || 0);
  if (!partnerId || !amountCents || amountCents <= 0) return;

  await creditPartnerWallet({
    partnerId,
    amount: amountCents / 100,
    reference: intent.metadata?.reference || `STRIPE-${intent.id}`,
    note: null,
    externalId: intent.id,
  });
}

async function creditPartnerWallet(input: {
  partnerId: string;
  amount: number;
  reference: string;
  note: string | null;
  externalId: string;
}) {
  const admin = getSupabaseAdmin();
  const { partnerId, amount, reference, note } = input;

  const { data: existing } = await admin
    .from('wallet_topup_requests')
    .select('id,status,amount')
    .eq('reference', reference)
    .maybeSingle();

  if (existing && existing.status === 'COMPLETED') return;

  const { data: partner } = await admin
    .from('partners')
    .select('id,user_id,balance,name')
    .eq('id', partnerId)
    .maybeSingle();
  if (!partner) return;

  const newBalance = (Number(partner.balance) || 0) + amount;
  const now = new Date().toISOString();

  if (existing) {
    await admin.from('wallet_topup_requests').update({
      status: 'COMPLETED',
      amount,
      payment_method: 'STRIPE',
      processed_at: now,
      updated_at: now,
      note: note ?? undefined,
    }).eq('id', existing.id);
  } else {
    await admin.from('wallet_topup_requests').insert([{
      reference,
      user_id: partner.user_id,
      partner_id: partnerId,
      amount,
      payment_method: 'STRIPE',
      note,
      status: 'COMPLETED',
      processed_at: now,
    }]);
  }

  await admin.from('partners')
    .update({ balance: newBalance, updated_at: now })
    .eq('id', partnerId);

  await admin.from('wallet_transactions').insert([{
    user_id: partner.user_id,
    partner_id: partnerId,
    type: 'TOPUP',
    amount,
    description: `Stripe-Aufladung ${amount.toFixed(2)} € (Ref. ${reference})`,
  }]);

  await admin.from('notifications').insert([{
    type: 'PARTNER_TOPUP_COMPLETED',
    title: 'Aufladung erfolgreich',
    message: `${partner.name || 'Partner'} hat ${amount.toFixed(2)} € aufgeladen.`,
    link: '/admin',
    is_read: false,
  }]);
}
