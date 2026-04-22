import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

type PartnerSummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  verification_status: string | null;
  package_code: string | null;
  lead_limit_used: number | null;
  lead_limit_monthly: number | null;
  is_available: boolean | null;
  bonus_tokens: number | null;
  website_url: string | null;
  verified_at: string | null;
  onboarding_completed_at: string | null;
};

export async function getPartnerDashboardData(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: partner, error: partnerError } = await supabaseAdmin
    .from('partners')
    .select(
      'id,name,email,phone,status,verification_status,package_code,lead_limit_used,lead_limit_monthly,is_available,bonus_tokens,website_url,verified_at,onboarding_completed_at',
    )
    .eq('user_id', userId)
    .maybeSingle<PartnerSummary>();

  if (partnerError) {
    throw new Error(partnerError.message);
  }

  if (!partner) {
    throw new Error('Partnerprofil wurde nicht gefunden.');
  }

  const [
    { data: profile, error: profileError },
    { data: packageRow, error: packageError },
    { data: subscription, error: subscriptionError },
    { data: paymentRows, error: paymentError },
    { data: walletRows, error: walletError },
    { data: serviceRows, error: serviceError },
    { data: regionRows, error: regionError },
    { data: assignmentRows, error: assignmentError },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('full_name,email,phone')
      .eq('id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('packages')
      .select('code,name,monthly_price,lead_limit_monthly,priority,release_delay_seconds,is_active')
      .eq('code', partner.package_code || 'FREE')
      .maybeSingle(),
    supabaseAdmin
      .from('subscriptions')
      .select('status,current_period_start,current_period_end,cancel_at_period_end,provider')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('payments')
      .select('id,amount,currency,status,paid_at,created_at,provider')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('wallet_transactions')
      .select('id,type,amount,description,created_at')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('partner_services')
      .select('service_code,is_active')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('service_regions')
      .select('country_code,postal_code,city,radius_km,created_at')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('lead_assignments')
      .select('id,status,priority,release_at,viewed_at,created_at,lead:leads(customer_name,service_code,city,postal_code,status,requested_at)')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const errors = [
    profileError,
    packageError,
    subscriptionError,
    paymentError,
    walletError,
    serviceError,
    regionError,
    assignmentError,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0]?.message || 'Partnerdaten konnten nicht geladen werden.');
  }

  const activeAssignments = (assignmentRows || []).filter((row) => row.status === 'RELEASED' || row.status === 'VIEWED');
  const queuedAssignments = (assignmentRows || []).filter((row) => row.status === 'QUEUED');

  return {
    partner,
    profile: profile || null,
    package: packageRow || null,
    subscription: subscription || null,
    payments: paymentRows || [],
    walletTransactions: walletRows || [],
    services: serviceRows || [],
    regions: regionRows || [],
    assignments: assignmentRows || [],
    stats: {
      availableLeadCount: activeAssignments.length,
      queuedLeadCount: queuedAssignments.length,
      leadLimitRemaining: Math.max((partner.lead_limit_monthly || 0) - (partner.lead_limit_used || 0), 0),
    },
  };
}
