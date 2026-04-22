import { supabase } from '@/lib/supabase';

export type AdminAccessLevel = 'admin' | 'employee' | 'none';

export type AdminAccessContext = {
  level: AdminAccessLevel;
  displayName: string;
  email: string | null;
};

export async function getAdminAccessContext(): Promise<AdminAccessContext> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      level: 'none',
      displayName: 'Admin',
      email: null,
    };
  }

  const email = user.email?.toLowerCase() || null;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Admin';
  const isAdmin = user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin';

  if (isAdmin) {
    return { level: 'admin', displayName, email };
  }

  if (!email) {
    return { level: 'none', displayName, email };
  }

  const { data: teamEntry } = await supabase
    .from('team')
    .select('role')
    .ilike('email', email)
    .maybeSingle();

  if (teamEntry?.role === 'EMPLOYEE') {
    return { level: 'employee', displayName, email };
  }

  if (teamEntry?.role === 'ADMIN') {
    return { level: 'admin', displayName, email };
  }

  return { level: 'none', displayName, email };
}
