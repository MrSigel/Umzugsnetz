import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function getEmployeeDashboardData(userId: string, email: string | null) {
  const supabaseAdmin = getSupabaseAdmin();
  const normalizedEmail = (email || '').trim().toLowerCase();

  const [
    { data: profile, error: profileError },
    { data: employee, error: employeeError },
    { count: assignedApplicationsCount, error: assignedApplicationsCountError },
    { count: leadCount, error: leadCountError },
    { count: contactRequestCount, error: contactRequestCountError },
    { data: applicationRows, error: applicationRowsError },
    { data: leadRows, error: leadRowsError },
    { data: contactRows, error: contactRowsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('full_name,email,primary_role')
      .eq('id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('employees')
      .select('status,scope,created_at,updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('partner_applications')
      .select('*', { count: 'exact', head: true })
      .or(`assigned_to_email.is.null,assigned_to_email.ilike.${normalizedEmail}`),
    supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'DONE'),
    supabaseAdmin
      .from('partner_applications')
      .select('id,company_name,contact_name,email,location,status,verification_status,assigned_to_email,created_at')
      .or(`assigned_to_email.is.null,assigned_to_email.ilike.${normalizedEmail}`)
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('leads')
      .select('id,customer_name,service_code,city,status,requested_at')
      .order('requested_at', { ascending: false })
      .limit(12),
    supabaseAdmin
      .from('contact_requests')
      .select('id,first_name,last_name,email,support_category,status,created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const errors = [
    profileError,
    employeeError,
    assignedApplicationsCountError,
    leadCountError,
    contactRequestCountError,
    applicationRowsError,
    leadRowsError,
    contactRowsError,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0]?.message || 'Mitarbeiterdaten konnten nicht geladen werden.');
  }

  return {
    profile: profile || null,
    employee: employee || null,
    stats: {
      assignedApplicationsCount: assignedApplicationsCount || 0,
      leadCount: leadCount || 0,
      contactRequestCount: contactRequestCount || 0,
    },
    applications: applicationRows || [],
    leads: leadRows || [],
    contactRequests: contactRows || [],
  };
}
