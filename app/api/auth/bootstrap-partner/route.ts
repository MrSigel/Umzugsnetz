import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type BootstrapBody = {
  companyName?: string;
  phone?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonError('Fehlende Anmeldung.', 401);
  }

  let body: BootstrapBody = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return jsonError('Supabase-Konfiguration fehlt.', 500);
  }

  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: sessionUser, error: sessionError } = await sessionClient.auth.getUser();
  if (sessionError || !sessionUser.user) {
    return jsonError('Sitzung konnte nicht verifiziert werden.', 401);
  }

  const user = sessionUser.user;
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return jsonError('Benutzerkonto ohne E-Mail-Adresse.', 400);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const fullName = String(user.user_metadata?.full_name || '').trim() || null;
  const companyName = body.companyName?.trim() || String(user.user_metadata?.company_name || '').trim() || email;
  const phone = body.phone?.trim() || null;

  await supabaseAdmin.from('profiles').upsert([{
    id: user.id,
    full_name: fullName,
    email,
    phone,
    primary_role: 'PARTNER',
    updated_at: new Date().toISOString(),
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
    }]);
  }

  return NextResponse.json({ success: true });
}
