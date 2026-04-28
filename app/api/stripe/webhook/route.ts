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
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscription(subscription, session.metadata?.partner_id, session.metadata?.package_code);
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
      default:
        break;
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook-Verarbeitung fehlgeschlagen.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
