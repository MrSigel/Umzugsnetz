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

export async function getAdminLeadSnapshot() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id,customer_name,service_code,city,status,requested_at')
    .order('requested_at', { ascending: false })
    .limit(8);

  return data || [];
}
