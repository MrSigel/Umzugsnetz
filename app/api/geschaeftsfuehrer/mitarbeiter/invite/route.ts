/**
 * API Route: Mitarbeiter Invite
 * Speichert neuen Mitarbeiter in der team-Tabelle
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: 'Email und Rolle erforderlich' },
        { status: 400 }
      );
    }

    const validRoles = ['Mitarbeiter', 'ADMIN', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Rolle' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Prüfen ob E-Mail bereits existiert
    const { data: existing } = await supabase
      .from('team')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Diese E-Mail-Adresse ist bereits registriert' },
        { status: 409 }
      );
    }

    // In team-Tabelle einfügen
    const { data: newMember, error } = await supabase
      .from('team')
      .insert({
        email: email.toLowerCase(),
        role,
        status: 'PENDING',
        invitation_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        message: `Einladung gesendet an ${email}`,
        data: newMember,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Invite error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Fehler beim Einladen' },
      { status: 500 }
    );
  }
}
