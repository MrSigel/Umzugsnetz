/**
 * API Route: Partner-Liste
 * Echte Daten aus Supabase
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: partners, error } = await supabase
      .from('partners')
      .select('id, user_id, name, email, phone, regions, service, status, category, balance, bonus_tokens, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Für jeden Partner die Anzahl der gekauften Leads zählen
    const { data: purchases, error: purchaseError } = await supabase
      .from('partner_purchases')
      .select('partner_id, price');

    if (purchaseError) throw purchaseError;

    const purchasesByPartner = new Map<string, { count: number; total: number }>();
    (purchases || []).forEach((p) => {
      const existing = purchasesByPartner.get(p.partner_id) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(p.price);
      purchasesByPartner.set(p.partner_id, existing);
    });

    const formattedPartners = (partners || []).map((p) => {
      const stats = purchasesByPartner.get(p.id) || { count: 0, total: 0 };
      return {
        id: p.id,
        companyName: p.name,
        email: p.email || '',
        phone: p.phone || '',
        location: p.regions || '',
        service: p.service,
        status: p.status,
        category: p.category,
        balance: Number(p.balance),
        bonusTokens: p.bonus_tokens,
        leadsPurchased: stats.count,
        totalSpent: stats.total,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedPartners,
      total: formattedPartners.length,
    });
  } catch (error: any) {
    console.error('Partner list error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Fehler beim Laden der Partner' },
      { status: 500 }
    );
  }
}
