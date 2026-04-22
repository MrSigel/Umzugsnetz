/**
 * API Route: Dashboard Stats
 * Echte Daten aus Supabase für das Geschäftsführer-Dashboard
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Partner-Statistiken
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, email, phone, regions, service, status, balance, created_at');

    if (partnersError) throw partnersError;

    const totalPartners = partners?.length || 0;
    const activePartners = partners?.filter((p) => p.status === 'ACTIVE').length || 0;
    const pendingPartners = partners?.filter((p) => p.status === 'PENDING').length || 0;

    // Team/Mitarbeiter-Statistiken
    const { data: team, error: teamError } = await supabase
      .from('team')
      .select('id, email, role, status, created_at');

    if (teamError) throw teamError;

    const totalEmployees = team?.length || 0;
    const activeEmployees = team?.filter((t) => t.status === 'ACTIVE').length || 0;

    // Offene Chat-Anfragen (ungelesene Nachrichten von Kunden)
    const { count: openChatCount, error: chatError } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender', 'user')
      .eq('is_read', false);

    if (chatError) throw chatError;

    // Umsatz-Statistiken aus Transaktionen
    const { data: transactions, error: trxError } = await supabase
      .from('transactions')
      .select('amount, type, created_at');

    if (trxError) throw trxError;

    const totalRevenue = transactions
      ?.filter((t) => t.type === 'LEAD_PURCHASE')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyRevenue = transactions
      ?.filter((t) => t.type === 'LEAD_PURCHASE' && t.created_at >= startOfMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Aktive Pakete
    const { data: packages, error: pkgError } = await supabase
      .from('packages')
      .select('code')
      .eq('is_active', true);

    if (pkgError) throw pkgError;

    // Letzte 5 Partner
    const recentPartners = (partners || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        companyName: p.name,
        email: p.email || '',
        status: p.status,
        createdAt: p.created_at,
      }));

    // Letzte Kundenanfragen (orders)
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, service_category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) throw ordersError;

    // Neue Partner-Bewerbungen
    const { count: pendingApplications, error: appError } = await supabase
      .from('partner_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'NEW');

    if (appError) throw appError;

    return NextResponse.json({
      success: true,
      data: {
        totalPartners,
        activePartners,
        pendingPartners,
        totalEmployees,
        activeEmployees,
        openChatRequests: openChatCount || 0,
        totalRevenue,
        monthlyRevenue,
        activePackages: packages?.length || 0,
        pendingApplications: pendingApplications || 0,
        recentPartners,
        recentOrders: (recentOrders || []).map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name,
          customerEmail: o.customer_email,
          serviceCategory: o.service_category,
          status: o.status,
          createdAt: o.created_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Fehler beim Laden der Dashboard-Daten' },
      { status: 500 }
    );
  }
}
