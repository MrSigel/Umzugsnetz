import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

type BootstrapPartnerOptions = {
  companyName?: string | null;
  phone?: string | null;
};

export async function bootstrapPartnerUser(user: User, options: BootstrapPartnerOptions = {}) {
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Benutzerkonto ohne E-Mail-Adresse.');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const fullName = String(user.user_metadata?.full_name || '').trim() || null;
  const companyName =
    options.companyName?.trim()
    || String(user.user_metadata?.company_name || '').trim()
    || email;
  const phone = options.phone?.trim() || String(user.user_metadata?.phone || '').trim() || null;

  await supabaseAdmin.from('profiles').upsert([{
    id: user.id,
    full_name: fullName,
    email,
    phone,
    primary_role: 'PARTNER',
    updated_at: now,
  }], { onConflict: 'id' });

  await supabaseAdmin.from('user_roles').upsert([{
    user_id: user.id,
    role_code: 'PARTNER',
  }], { onConflict: 'user_id,role_code' });

  const { data: partner } = await supabaseAdmin
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!partner) {
    await supabaseAdmin.from('partners').insert([{
      user_id: user.id,
      profile_id: user.id,
      name: companyName,
      email,
      phone,
      status: 'PENDING',
      verification_status: 'PENDING',
      package_code: 'FREE',
      category: 'Standard Anfragen',
      balance: 0,
      settings: {
        emailNotif: true,
        smsNotif: true,
      },
      updated_at: now,
    }]);
  }
}
