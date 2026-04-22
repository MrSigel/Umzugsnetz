import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { bootstrapPartnerUser } from '@/lib/auth/bootstrapPartnerUser';

export const dynamic = 'force-dynamic';

type BootstrapBody = {
  companyName?: string;
  phone?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
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
    const metadataRole = String(user.app_metadata?.role || user.user_metadata?.role || '').toUpperCase();
    if (metadataRole && metadataRole !== 'PARTNER') {
      return NextResponse.json({ success: true, skipped: true });
    }

    const email = user.email?.trim().toLowerCase();
    if (!email) {
      return jsonError('Benutzerkonto ohne E-Mail-Adresse.', 400);
    }

    await bootstrapPartnerUser(user, {
      companyName: body.companyName || email,
      phone: body.phone,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Partnerprofil konnte nicht vorbereitet werden.';
    return jsonError(message, 500);
  }
}
