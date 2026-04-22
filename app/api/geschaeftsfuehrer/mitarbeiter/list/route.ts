/**
 * API Route: Mitarbeiter-Liste
 * Echte Daten aus Supabase team-Tabelle
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: team, error } = await supabase
      .from('team')
      .select('id, email, role, status, invited_by_email, invitation_sent_at, onboarding_seen_at, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedTeam = (team || []).map((t) => ({
      id: t.id,
      email: t.email,
      role: t.role,
      status: t.status,
      invitedBy: t.invited_by_email || '',
      invitedAt: t.invitation_sent_at,
      onboardingSeen: !!t.onboarding_seen_at,
      createdAt: t.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedTeam,
      total: formattedTeam.length,
    });
  } catch (error: any) {
    console.error('Team list error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Fehler beim Laden der Mitarbeiter' },
      { status: 500 }
    );
  }
}
