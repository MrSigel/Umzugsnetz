import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function getAdminOverviewStats() {
  const supabaseAdmin = getSupabaseAdmin();

  const [
    { count: partnerCount },
    { count: verifiedPartnerCount },
    { count: leadCount },
    { count: queuedAssignmentCount },
    { count: employeeCount },
  ] = await Promise.all([
    supabaseAdmin.from('partners').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('partners').select('*', { count: 'exact', head: true }).eq('verification_status', 'VERIFIED'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('lead_assignments').select('*', { count: 'exact', head: true }).eq('status', 'QUEUED'),
    supabaseAdmin.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
  ]);

  return {
    partnerCount: partnerCount || 0,
    verifiedPartnerCount: verifiedPartnerCount || 0,
    leadCount: leadCount || 0,
    queuedAssignmentCount: queuedAssignmentCount || 0,
    employeeCount: employeeCount || 0,
  };
}

export async function getAdminPartnerSnapshot() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('partners')
    .select('id,name,email,status,verification_status,package_code,lead_limit_used,lead_limit_monthly,updated_at')
    .order('updated_at', { ascending: false })
    .limit(8);

  return data || [];
}

export async function getAdminPartnerApplicationSnapshot() {
  const supabaseAdmin = getSupabaseAdmin();

  const [
    { count: applicationCount },
    { count: verifiedApplicationCount },
    { count: pendingInviteCount },
    { data: applications },
  ] = await Promise.all([
    supabaseAdmin.from('partner_applications').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('partner_applications').select('*', { count: 'exact', head: true }).eq('verification_status', 'VERIFIED'),
    supabaseAdmin.from('partner_applications').select('*', { count: 'exact', head: true }).is('invite_sent_at', null),
    supabaseAdmin
      .from('partner_applications')
      .select('id,company_name,contact_name,email,location,status,verification_status,verification_score,invite_sent_at,invite_sent_to,created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    stats: {
      applicationCount: applicationCount || 0,
      verifiedApplicationCount: verifiedApplicationCount || 0,
      pendingInviteCount: pendingInviteCount || 0,
    },
    applications: applications || [],
  };
}

export async function getAdminLeadSnapshot() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id,customer_name,service_code,city,status,requested_at')
    .order('requested_at', { ascending: false })
    .limit(8);

  return data || [];
}

export async function getAdminPaymentSnapshot() {
  const supabaseAdmin = getSupabaseAdmin();

  const [
    { count: paymentCount },
    { count: paidCount },
    { count: subscriptionCount },
    { count: topupRequestCount },
    { data: payments },
    { data: subscriptions },
    { data: topupRequests },
  ] = await Promise.all([
    supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'PAID'),
    supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabaseAdmin.from('wallet_topup_requests').select('*', { count: 'exact', head: true }).in('status', ['REQUESTED', 'IN_REVIEW']),
    supabaseAdmin
      .from('payments')
      .select('id,amount,currency,status,provider,paid_at,created_at,partner:partners(name,email)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('subscriptions')
      .select('id,status,package_code,current_period_end,cancel_at_period_end,partner:partners(name,email)')
      .order('updated_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('wallet_topup_requests')
      .select('id,reference,amount,status,payment_method,created_at,partner:partners(name,email)')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  return {
    stats: {
      paymentCount: paymentCount || 0,
      paidCount: paidCount || 0,
      activeSubscriptionCount: subscriptionCount || 0,
      openTopupRequestCount: topupRequestCount || 0,
    },
    payments: payments || [],
    subscriptions: subscriptions || [],
    topupRequests: topupRequests || [],
  };
}

export async function getAdminSettingsSnapshot() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('id,key,value,updated_at')
    .order('key', { ascending: true });

  return data || [];
}

export async function getAdminCommunicationSnapshot() {
  const supabaseAdmin = getSupabaseAdmin();

  const [
    { count: openConversationCount },
    { count: unreadMessageCount },
    { count: openContactRequestCount },
    { data: conversations },
    { data: recentMessages },
    { data: contactRequests },
  ] = await Promise.all([
    supabaseAdmin.from('chat_conversations').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
    supabaseAdmin.from('chat_messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
    supabaseAdmin.from('contact_requests').select('*', { count: 'exact', head: true }).neq('status', 'DONE'),
    supabaseAdmin
      .from('chat_conversations')
      .select('id,external_session_id,customer_name,customer_email,status,source,updated_at')
      .order('updated_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('chat_messages')
      .select('id,session_id,sender,support_category,user_name,text,is_read,created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('contact_requests')
      .select('id,first_name,last_name,email,support_category,status,created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  return {
    stats: {
      openConversationCount: openConversationCount || 0,
      unreadMessageCount: unreadMessageCount || 0,
      openContactRequestCount: openContactRequestCount || 0,
    },
    conversations: conversations || [],
    recentMessages: recentMessages || [],
    contactRequests: contactRequests || [],
  };
}
