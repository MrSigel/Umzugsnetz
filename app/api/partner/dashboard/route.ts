import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import {
  DEFAULT_PRICING_CONFIG,
  getLeadPrice,
  getPricingGroup,
  normalizePricingConfig,
  type PricingConfig,
} from '@/lib/pricing';
import { DEFAULT_BILLING_SETTINGS, normalizeBillingSettings, type BillingSettings } from '@/lib/settings';
import { appBaseUrl, getStripeClient, isStripeConfigured, priceIdForPackage, type PartnerPackageCode } from '@/lib/server/stripe';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

const ALLOWED_LEAD_STATUSES = ['Neu', 'Kontaktiert', 'Angebot', 'Gebucht', 'Abgelehnt'] as const;
type LeadStatus = (typeof ALLOWED_LEAD_STATUSES)[number];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getSessionClient(authHeader: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase-Konfiguration fehlt.');
  }

  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticateUser(request: Request): Promise<User> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('Fehlende Anmeldung.');
  }

  const sessionClient = getSessionClient(authHeader);
  const { data, error } = await sessionClient.auth.getUser();
  if (error || !data.user) {
    throw new Error('Sitzung konnte nicht verifiziert werden.');
  }

  return data.user;
}

async function loadPartnerForUser(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from('partners')
    .select(
      'id,user_id,name,email,phone,regions,service,status,category,balance,bonus_tokens,bonus_tokens_claimed_at,settings,package_code,verification_status,lead_limit_monthly,lead_limit_used,is_available,onboarding_completed_at,website_url,created_at,updated_at',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Partnerprofil konnte nicht geladen werden.');
  }

  return data;
}

async function loadPricingConfig(admin: SupabaseClient): Promise<PricingConfig> {
  const { data } = await admin.from('system_settings').select('value').eq('key', 'pricing_config').maybeSingle();
  return normalizePricingConfig(data?.value);
}

async function loadBillingSettings(admin: SupabaseClient): Promise<BillingSettings> {
  const { data } = await admin.from('system_settings').select('value').eq('key', 'billing_settings').maybeSingle();
  return normalizeBillingSettings(data?.value);
}

async function loadMinTopupAmount(admin: SupabaseClient): Promise<number> {
  const { data } = await admin.from('system_settings').select('value').eq('key', 'min_topup_amount').maybeSingle();
  const value = Number(data?.value || 10);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function normalizeServiceCode(value: unknown): 'UMZUG' | 'ENTRUEMPELUNG' | null {
  const code = String(value || '').trim().toUpperCase();
  if (code === 'UMZUG') return 'UMZUG';
  if (code === 'ENTRUEMPELUNG' || code === 'ENTRÜMPELUNG') return 'ENTRUEMPELUNG';
  return null;
}

function serviceCategoryToCode(value: unknown): 'UMZUG' | 'ENTRUEMPELUNG' | null {
  const cat = String(value || '').trim().toUpperCase();
  if (cat === 'PRIVATUMZUG' || cat === 'FIRMENUMZUG') return 'UMZUG';
  if (cat === 'ENTRÜMPELUNG' || cat === 'ENTRUEMPELUNG') return 'ENTRUEMPELUNG';
  return null;
}

function tokensToList(value: unknown): string[] {
  return String(value || '')
    .split(/[,;\n]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function regionMatchesOrder(
  order: JsonRecord,
  regionRows: Array<{ city?: string | null; postal_code?: string | null }>,
  partnerRegions: string | null | undefined,
) {
  const orderCity = String(order.von_city || order.nach_city || '').toLowerCase();
  const orderPlz = String(order.von_plz || order.nach_plz || '').replace(/\D/g, '');

  if (regionRows.length === 0 && !partnerRegions) {
    return true;
  }

  for (const row of regionRows) {
    const city = String(row.city || '').toLowerCase();
    const plz = String(row.postal_code || '').replace(/\D/g, '');
    if (city && orderCity && (orderCity.includes(city) || city.includes(orderCity))) {
      return true;
    }
    if (plz && orderPlz && plz.length >= 2 && orderPlz.startsWith(plz.slice(0, Math.min(3, plz.length)))) {
      return true;
    }
  }

  const tokens = tokensToList(partnerRegions);
  if (tokens.length === 0) return regionRows.length === 0;
  return tokens.some((token) => orderCity.includes(token) || token.includes(orderCity));
}

function maskCity(city: unknown) {
  const value = String(city || '').trim();
  return value || 'Region wird nach Kauf sichtbar';
}

function maskPlz(plz: unknown) {
  const value = String(plz || '').replace(/\D/g, '');
  if (value.length < 2) return null;
  return `${value.slice(0, 2)}xxx`;
}

function toIsoDate(value: unknown) {
  if (!value) return null;
  try {
    return new Date(String(value)).toISOString();
  } catch {
    return null;
  }
}

function toNumber(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

async function buildDashboardPayload(admin: SupabaseClient, user: User) {
  let partner = await loadPartnerForUser(admin, user.id);

  if (!partner) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: 'Partnerprofil nicht gefunden.',
          redirectTo: '/portal/onboarding/partner',
        },
        { status: 404 },
      ),
    };
  }

  if (!partner.onboarding_completed_at) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: 'Onboarding ist noch nicht abgeschlossen.',
          redirectTo: '/portal/onboarding/partner',
        },
        { status: 409 },
      ),
    };
  }

  const partnerId = partner.id as string;

  if (partner.verification_status !== 'VERIFIED' && partner.verification_status !== 'REJECTED' && partner.verification_status !== 'SUSPENDED') {
    const userCreatedAt = user.created_at ? new Date(user.created_at).getTime() : Date.now();
    const emailConfirmed = Boolean(user.email_confirmed_at);
    const accountAgeMinutes = (Date.now() - userCreatedAt) / 60000;
    if (emailConfirmed && accountAgeMinutes >= 10) {
      const nowIso = new Date().toISOString();
      await admin
        .from('partners')
        .update({ verification_status: 'VERIFIED', verified_at: nowIso, updated_at: nowIso })
        .eq('id', partnerId);
      partner = { ...partner, verification_status: 'VERIFIED' };
    }
  }

  const [
    { data: profile },
    { data: regionRows },
    { data: serviceRows },
    { data: orderRows },
    { data: purchaseRows },
    { data: walletRows },
    { data: topupRows },
    { data: notificationRows },
    pricingConfig,
    billingSettings,
    minTopupAmount,
  ] = await Promise.all([
    admin.from('profiles').select('id,full_name,email,phone,onboarding_completed_at').eq('id', user.id).maybeSingle(),
    admin
      .from('service_regions')
      .select('id,city,postal_code,radius_km,country_code')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: true }),
    admin.from('partner_services').select('service_code,is_active').eq('partner_id', partnerId),
    admin
      .from('orders')
      .select(
        'id,order_number,service_category,customer_name,customer_email,customer_phone,move_date,von_city,von_address,von_plz,von_floor,von_lift,nach_city,nach_address,nach_plz,nach_floor,nach_lift,size_info,rooms_info,sqm,additional_services,notes,erreichbarkeit,estimated_price,status,created_at',
      )
      .order('created_at', { ascending: false })
      .limit(120),
    admin
      .from('partner_purchases')
      .select('id,order_id,price,created_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false }),
    admin
      .from('wallet_transactions')
      .select('id,type,amount,description,created_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('wallet_topup_requests')
      .select('id,reference,amount,payment_method,note,status,created_at,processed_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('notifications')
      .select('id,title,message,link,is_read,type,created_at')
      .eq('audience', 'PARTNER')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(20),
    loadPricingConfig(admin),
    loadBillingSettings(admin),
    loadMinTopupAmount(admin),
  ]);

  const [{ data: packageRows }, { data: subscriptionRow }] = await Promise.all([
    admin
      .from('packages')
      .select('code,name,monthly_price,lead_limit_monthly,priority,release_delay_seconds,is_active')
      .eq('is_active', true)
      .order('priority', { ascending: false }),
    admin
      .from('subscriptions')
      .select('id,package_code,provider,external_reference,status,current_period_start,current_period_end,cancel_at_period_end')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const orders = (orderRows || []) as JsonRecord[];
  const purchases = (purchaseRows || []) as Array<{ order_id: string; price: number | string; created_at: string; id: string }>;
  const purchasedIds = new Set(purchases.map((row) => String(row.order_id)));

  const activeServices = (serviceRows || [])
    .filter((row) => row.is_active !== false)
    .map((row) => normalizeServiceCode(row.service_code))
    .filter((code): code is 'UMZUG' | 'ENTRUEMPELUNG' => Boolean(code));
  const allowsAllServices = activeServices.length === 0;

  const ordersById = new Map<string, JsonRecord>();
  for (const order of orders) ordersById.set(String(order.id), order);

  const tier = getPricingGroup(pricingConfig, 'PRIVATUMZUG').find((entry) => entry.alias === partner.category) || null;

  const myLeads = purchases
    .map((purchase) => {
      const order = ordersById.get(String(purchase.order_id));
      if (!order) return null;
      return {
        id: String(order.id),
        purchase_id: purchase.id,
        purchase_price: toNumber(purchase.price),
        purchased_at: purchase.created_at,
        order_number: order.order_number,
        service_category: order.service_category,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        move_date: order.move_date,
        von_city: order.von_city,
        von_address: order.von_address,
        von_plz: order.von_plz,
        von_floor: order.von_floor,
        von_lift: order.von_lift,
        nach_city: order.nach_city,
        nach_address: order.nach_address,
        nach_plz: order.nach_plz,
        nach_floor: order.nach_floor,
        nach_lift: order.nach_lift,
        size_info: order.size_info,
        rooms_info: order.rooms_info,
        sqm: order.sqm,
        additional_services: order.additional_services,
        notes: order.notes,
        erreichbarkeit: order.erreichbarkeit,
        estimated_price: order.estimated_price,
        status: order.status,
        created_at: order.created_at,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  const marketplace = orders
    .filter((order) => {
      if (purchasedIds.has(String(order.id))) return false;
      if (String(order.status || '') === 'Storniert') return false;
      const code = serviceCategoryToCode(order.service_category);
      if (!code) return false;
      if (!allowsAllServices && !activeServices.includes(code)) return false;
      return regionMatchesOrder(order, regionRows || [], partner.regions);
    })
    .map((order) => {
      const price = getLeadPrice(pricingConfig, partner.category, order.service_category as string);
      return {
        id: String(order.id),
        order_number: order.order_number,
        service_category: order.service_category,
        move_date: order.move_date,
        von_city_masked: maskCity(order.von_city),
        nach_city_masked: maskCity(order.nach_city),
        von_plz_masked: maskPlz(order.von_plz),
        nach_plz_masked: maskPlz(order.nach_plz),
        size_info: order.size_info,
        rooms_info: order.rooms_info,
        sqm: order.sqm,
        additional_services: order.additional_services,
        erreichbarkeit: order.erreichbarkeit,
        estimated_price: order.estimated_price,
        status: order.status,
        created_at: order.created_at,
        price,
      };
    })
    .slice(0, 50);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const purchasesThisMonth = purchases.filter((row) => row.created_at && row.created_at >= startOfMonth);
  const wonThisMonth = myLeads.filter((lead) => lead.status === 'Gebucht' && (lead.purchased_at || '') >= startOfMonth);
  const conversionRate = purchases.length > 0
    ? Math.round((myLeads.filter((lead) => lead.status === 'Gebucht').length / purchases.length) * 100)
    : 0;

  return {
    ok: true as const,
    payload: {
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        regions: partner.regions,
        service: partner.service,
        status: partner.status,
        category: partner.category,
        balance: toNumber(partner.balance),
        bonus_tokens: Number(partner.bonus_tokens || 0),
        bonus_tokens_claimed_at: partner.bonus_tokens_claimed_at,
        package_code: partner.package_code,
        verification_status: partner.verification_status,
        lead_limit_monthly: Number(partner.lead_limit_monthly || 0),
        lead_limit_used: Number(partner.lead_limit_used || 0),
        is_available: partner.is_available !== false,
        website_url: partner.website_url,
        settings: partner.settings || {},
        created_at: partner.created_at,
      },
      profile: {
        full_name: profile?.full_name || null,
        email: profile?.email || partner.email || user.email || null,
        phone: profile?.phone || partner.phone || null,
      },
      serviceRegions: regionRows || [],
      partnerServices: activeServices,
      pricingTier: tier,
      pricingConfig,
      billingSettings,
      minTopupAmount,
      kpis: {
        balance: toNumber(partner.balance),
        bonus_tokens: Number(partner.bonus_tokens || 0),
        purchases_this_month: purchasesThisMonth.length,
        purchases_total: purchases.length,
        won_this_month: wonThisMonth.length,
        open_leads_available: marketplace.length,
        conversion_rate: conversionRate,
      },
      marketplace,
      myLeads,
      walletTransactions: walletRows || [],
      topupRequests: topupRows || [],
      notifications: notificationRows || [],
      packages: (packageRows || []).map((row) => ({
        code: row.code,
        name: row.name,
        monthly_price: toNumber(row.monthly_price),
        lead_limit_monthly: Number(row.lead_limit_monthly || 0),
        priority: Number(row.priority || 0),
        release_delay_seconds: Number(row.release_delay_seconds || 0),
        purchasable: row.code !== 'FREE' && Boolean(priceIdForPackage(row.code as PartnerPackageCode)),
      })),
      subscription: subscriptionRow ? {
        id: subscriptionRow.id,
        package_code: subscriptionRow.package_code,
        provider: subscriptionRow.provider,
        external_reference: subscriptionRow.external_reference,
        status: subscriptionRow.status,
        current_period_start: subscriptionRow.current_period_start,
        current_period_end: subscriptionRow.current_period_end,
        cancel_at_period_end: subscriptionRow.cancel_at_period_end,
      } : null,
      stripeConfigured: isStripeConfigured(),
    },
  };
}

export async function GET(request: Request) {
  let user: User;
  try {
    user = await authenticateUser(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.';
    return jsonError(message, message === 'Fehlende Anmeldung.' ? 401 : 401);
  }

  const admin = getSupabaseAdmin();

  try {
    const result = await buildDashboardPayload(admin, user);
    if (!result.ok) return result.response;
    return NextResponse.json(result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Daten konnten nicht geladen werden.';
    return jsonError(message, 500);
  }
}

type ActionBody = {
  action?: string;
  orderId?: string;
  status?: string;
  notes?: string;
  amount?: number | string;
  note?: string;
  phone?: string;
  websiteUrl?: string;
  settings?: JsonRecord;
  isAvailable?: boolean;
  notificationId?: string;
  packageCode?: string;
};

async function handlePurchaseLead(admin: SupabaseClient, user: User, partnerId: string, body: ActionBody) {
  const orderId = String(body.orderId || '').trim();
  if (!orderId) return jsonError('Auftrag fehlt.', 400);

  const [{ data: order }, { data: partner }, pricingConfig] = await Promise.all([
    admin.from('orders').select('id,service_category,status').eq('id', orderId).maybeSingle(),
    admin.from('partners').select('id,category,balance,bonus_tokens').eq('id', partnerId).maybeSingle(),
    loadPricingConfig(admin),
  ]);

  if (!order) return jsonError('Auftrag wurde nicht gefunden.', 404);
  if (!partner) return jsonError('Partnerprofil nicht gefunden.', 404);

  const { data: existingPurchase } = await admin
    .from('partner_purchases')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('order_id', orderId)
    .maybeSingle();

  if (existingPurchase) {
    return jsonError('Diese Anfrage wurde bereits gekauft.', 409);
  }

  const price = getLeadPrice(pricingConfig, partner.category, order.service_category as string);

  const usingBonus = Number(partner.bonus_tokens || 0) > 0;
  if (!usingBonus && Number(partner.balance || 0) < price) {
    return jsonError('Nicht genügend Guthaben. Bitte laden Sie Ihr Konto auf.', 402);
  }

  const { error: rpcError } = await admin.rpc('purchase_lead', {
    order_id_param: orderId,
    partner_id_param: partnerId,
    price_param: price,
  });

  if (rpcError) {
    return jsonError(rpcError.message || 'Kauf fehlgeschlagen.', 500);
  }

  await admin.from('notifications').insert([{
    type: 'PARTNER_LEAD_PURCHASE',
    title: 'Anfrage gekauft',
    message: `Eine Partnerfirma hat eine Anfrage gekauft (${price.toFixed(2)} €).`,
    link: '/admin',
    is_read: false,
  }]);

  return NextResponse.json({ success: true, price });
}

async function handleUpdateStatus(admin: SupabaseClient, partnerId: string, body: ActionBody) {
  const orderId = String(body.orderId || '').trim();
  const status = String(body.status || '').trim() as LeadStatus;
  if (!orderId) return jsonError('Auftrag fehlt.', 400);
  if (!ALLOWED_LEAD_STATUSES.includes(status)) return jsonError('Ungültiger Status.', 400);

  const { data: purchase } = await admin
    .from('partner_purchases')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('order_id', orderId)
    .maybeSingle();

  if (!purchase) return jsonError('Diese Anfrage gehört nicht zu Ihrem Konto.', 403);

  const dbStatus =
    status === 'Gebucht' ? 'Abgeschlossen'
    : status === 'Abgelehnt' ? 'Storniert'
    : status === 'Kontaktiert' || status === 'Angebot' ? 'In Bearbeitung'
    : 'Neu';

  const updates: JsonRecord = { status: dbStatus, updated_at: new Date().toISOString() };
  const noteText = String(body.notes || '').trim();
  if (noteText) {
    const { data: current } = await admin.from('orders').select('notes').eq('id', orderId).maybeSingle();
    const existing = String(current?.notes || '').trim();
    const stamp = new Date().toLocaleString('de-DE');
    const entry = `[${stamp}] Partner: ${noteText}`;
    updates.notes = existing ? `${existing}\n${entry}` : entry;
  }

  const { error } = await admin.from('orders').update(updates).eq('id', orderId);
  if (error) return jsonError(error.message || 'Status konnte nicht aktualisiert werden.', 500);

  return NextResponse.json({ success: true, status });
}

function generateTopupReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TOPUP-${Date.now().toString(36).toUpperCase()}-${random}`;
}

async function handleTopup(admin: SupabaseClient, user: User, partnerId: string, body: ActionBody) {
  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError('Bitte einen Betrag größer 0 € angeben.', 400);
  }

  const minAmount = Math.max(await loadMinTopupAmount(admin), 10);
  if (amount < minAmount) {
    return jsonError(`Mindestbetrag ${minAmount.toFixed(2)} €.`, 400);
  }

  if (!isStripeConfigured()) {
    return jsonError('Online-Aufladung ist aktuell nicht verfügbar. Bitte den Support kontaktieren.', 503);
  }

  const { data: partnerRow } = await admin
    .from('partners')
    .select('id,name,email,settings')
    .eq('id', partnerId)
    .maybeSingle();

  if (!partnerRow) return jsonError('Partnerprofil nicht gefunden.', 404);

  let customerId: string;
  try {
    customerId = await ensureStripeCustomer(admin, partnerRow);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Stripe-Kundenkonto konnte nicht angelegt werden.', 500);
  }

  const stripe = getStripeClient();
  const baseUrl = appBaseUrl();
  const amountCents = Math.round(amount * 100);
  const note = String(body.note || '').trim();
  const reference = generateTopupReference();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
          product_data: {
            name: 'Guthaben-Aufladung Umzugsnetz',
            description: `Manuelle Aufladung über ${amount.toFixed(2)} €`,
          },
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/crm/partner?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/crm/partner?topup=cancel`,
      metadata: {
        partner_id: partnerId,
        type: 'wallet_topup',
        amount_cents: String(amountCents),
        reference,
        note: note.slice(0, 200),
      },
      payment_intent_data: {
        metadata: {
          partner_id: partnerId,
          type: 'wallet_topup',
          amount_cents: String(amountCents),
          reference,
        },
      },
    });

    if (!session.url) {
      return jsonError('Stripe-Checkout konnte nicht gestartet werden.', 500);
    }

    await admin.from('wallet_topup_requests').insert([{
      reference,
      user_id: user.id,
      partner_id: partnerId,
      amount,
      payment_method: 'STRIPE',
      note: note || null,
      status: 'IN_REVIEW',
    }]);

    return NextResponse.json({ success: true, reference, checkoutUrl: session.url });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Stripe-Checkout fehlgeschlagen.', 500);
  }
}

async function handleClaimBonus(sessionClient: SupabaseClient, partnerId: string) {
  const { data, error } = await sessionClient.rpc('claim_partner_bonus', {
    partner_id_param: partnerId,
  });

  if (error) return jsonError(error.message || 'Startbonus konnte nicht aktiviert werden.', 400);

  return NextResponse.json({ success: true, tokens: Number(data || 0) });
}

async function handleUpdateProfile(admin: SupabaseClient, user: User, partnerId: string, body: ActionBody) {
  const updates: JsonRecord = { updated_at: new Date().toISOString() };

  if (typeof body.phone === 'string') {
    const phone = body.phone.trim();
    if (phone.length < 5) return jsonError('Bitte eine gültige Telefonnummer angeben.', 400);
    updates.phone = phone;
    await admin.from('profiles').update({ phone, updated_at: new Date().toISOString() }).eq('id', user.id);
  }

  if (typeof body.websiteUrl === 'string') {
    const trimmed = body.websiteUrl.trim();
    updates.website_url = trimmed
      ? (trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
      : null;
  }

  if (body.settings && typeof body.settings === 'object') {
    const { data: current } = await admin.from('partners').select('settings').eq('id', partnerId).maybeSingle();
    const merged = {
      ...(current?.settings && typeof current.settings === 'object' ? current.settings as JsonRecord : {}),
      ...body.settings,
    };
    updates.settings = merged;
  }

  if (typeof body.isAvailable === 'boolean') {
    updates.is_available = body.isAvailable;
  }

  const { error } = await admin.from('partners').update(updates).eq('id', partnerId);
  if (error) return jsonError(error.message || 'Profil konnte nicht aktualisiert werden.', 500);

  return NextResponse.json({ success: true });
}

async function handleMarkNotificationRead(admin: SupabaseClient, partnerId: string, body: ActionBody) {
  const id = String(body.notificationId || '').trim();
  if (!id) return jsonError('Hinweis-ID fehlt.', 400);
  const { error } = await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('audience', 'PARTNER')
    .eq('partner_id', partnerId);
  if (error) return jsonError(error.message || 'Konnte nicht aktualisiert werden.', 500);
  return NextResponse.json({ success: true });
}

async function ensureStripeCustomer(admin: SupabaseClient, partner: { id: string; settings: unknown; email?: string | null; name?: string | null }) {
  const stripe = getStripeClient();
  const settings = (partner.settings && typeof partner.settings === 'object' ? partner.settings as Record<string, unknown> : {});
  const existingId = typeof settings.stripe_customer_id === 'string' ? settings.stripe_customer_id : null;

  if (existingId) {
    try {
      const customer = await stripe.customers.retrieve(existingId);
      if (customer && !(customer as { deleted?: boolean }).deleted) {
        return existingId;
      }
    } catch {
      // fall through and create a new one
    }
  }

  const customer = await stripe.customers.create({
    email: partner.email || undefined,
    name: partner.name || undefined,
    metadata: {
      partner_id: partner.id,
    },
  });

  await admin
    .from('partners')
    .update({
      settings: { ...settings, stripe_customer_id: customer.id },
      updated_at: new Date().toISOString(),
    })
    .eq('id', partner.id);

  return customer.id;
}

async function handleSubscribePackage(admin: SupabaseClient, partnerId: string, body: ActionBody) {
  const code = String(body.packageCode || '').toUpperCase() as PartnerPackageCode;
  if (code !== 'PREMIUM' && code !== 'BUSINESS') {
    return jsonError('Ungültiges Paket.', 400);
  }

  if (!isStripeConfigured()) {
    return jsonError('Stripe ist noch nicht konfiguriert. Bitte den Support kontaktieren.', 503);
  }

  const priceId = priceIdForPackage(code);
  if (!priceId) {
    return jsonError(`Für das Paket ${code} ist keine Stripe-Preis-ID hinterlegt.`, 503);
  }

  const { data: partnerRow } = await admin
    .from('partners')
    .select('id,name,email,settings')
    .eq('id', partnerId)
    .maybeSingle();

  if (!partnerRow) return jsonError('Partnerprofil nicht gefunden.', 404);

  let customerId: string;
  try {
    customerId = await ensureStripeCustomer(admin, partnerRow);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Stripe-Kundenkonto konnte nicht angelegt werden.', 500);
  }

  const stripe = getStripeClient();
  const baseUrl = appBaseUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/crm/partner?package=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/crm/partner?package=cancel`,
      allow_promotion_codes: true,
      metadata: {
        partner_id: partnerId,
        package_code: code,
      },
      subscription_data: {
        metadata: {
          partner_id: partnerId,
          package_code: code,
        },
      },
    });

    if (!session.url) {
      return jsonError('Stripe-Checkout konnte nicht gestartet werden.', 500);
    }

    return NextResponse.json({ success: true, checkoutUrl: session.url });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Stripe-Checkout fehlgeschlagen.', 500);
  }
}

async function handleManageSubscription(admin: SupabaseClient, partnerId: string) {
  if (!isStripeConfigured()) {
    return jsonError('Stripe ist noch nicht konfiguriert.', 503);
  }

  const { data: partnerRow } = await admin
    .from('partners')
    .select('id,name,email,settings')
    .eq('id', partnerId)
    .maybeSingle();

  if (!partnerRow) return jsonError('Partnerprofil nicht gefunden.', 404);

  const settings = (partnerRow.settings && typeof partnerRow.settings === 'object'
    ? partnerRow.settings as Record<string, unknown>
    : {});
  const customerId = typeof settings.stripe_customer_id === 'string' ? settings.stripe_customer_id : null;
  if (!customerId) {
    return jsonError('Es ist keine aktive Stripe-Subscription hinterlegt.', 404);
  }

  const stripe = getStripeClient();
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appBaseUrl()}/crm/partner`,
    });
    return NextResponse.json({ success: true, portalUrl: portal.url });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Stripe-Portal konnte nicht geöffnet werden.', 500);
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonError('Fehlende Anmeldung.', 401);
  }

  const sessionClient = getSessionClient(authHeader);
  const { data: sessionData, error: sessionError } = await sessionClient.auth.getUser();
  if (sessionError || !sessionData.user) {
    return jsonError('Sitzung konnte nicht verifiziert werden.', 401);
  }

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return jsonError('Ungültige Anfrage.', 400);
  }

  const action = String(body.action || '').trim();
  if (!action) return jsonError('Aktion fehlt.', 400);

  const admin = getSupabaseAdmin();
  const user = sessionData.user;
  const partner = await loadPartnerForUser(admin, user.id);
  if (!partner) return jsonError('Partnerprofil nicht gefunden.', 404);
  const partnerId = partner.id as string;

  try {
    switch (action) {
      case 'purchase_lead':
        return await handlePurchaseLead(admin, user, partnerId, body);
      case 'update_status':
        return await handleUpdateStatus(admin, partnerId, body);
      case 'topup':
        return await handleTopup(admin, user, partnerId, body);
      case 'claim_bonus':
        return await handleClaimBonus(sessionClient, partnerId);
      case 'update_profile':
        return await handleUpdateProfile(admin, user, partnerId, body);
      case 'mark_notification_read':
        return await handleMarkNotificationRead(admin, partnerId, body);
      case 'subscribe_package':
        return await handleSubscribePackage(admin, partnerId, body);
      case 'manage_subscription':
        return await handleManageSubscription(admin, partnerId);
      default:
        return jsonError('Unbekannte Aktion.', 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Aktion fehlgeschlagen.';
    return jsonError(message, 500);
  }
}
