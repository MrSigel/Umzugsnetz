/**
 * API Route: Pakete-Liste
 * Echte Daten aus Supabase packages-Tabelle
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: packages, error } = await supabase
      .from('packages')
      .select('code, name, monthly_price, lead_limit_monthly, priority, release_delay_seconds, is_active, created_at, updated_at')
      .order('priority', { ascending: true });

    if (error) throw error;

    // Auch die Preiskonfiguration aus system_settings laden
    const { data: pricingSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_config')
      .single();

    const formattedPackages = (packages || []).map((pkg) => ({
      id: pkg.code,
      name: pkg.name,
      monthlyPrice: Number(pkg.monthly_price),
      leadLimitMonthly: pkg.lead_limit_monthly,
      priority: pkg.priority,
      releaseDelaySeconds: pkg.release_delay_seconds,
      isActive: pkg.is_active,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedPackages,
      total: formattedPackages.length,
      pricingConfig: pricingSettings?.value || null,
    });
  } catch (error: any) {
    console.error('Packages list error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Fehler beim Laden der Pakete' },
      { status: 500 }
    );
  }
}
