'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, 
  Users, 
  TrendingUp, 
  ChevronRight,
  DollarSign,
  BarChart3,
  Activity,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    orders: 0,
    partners: 0,
    pendingPartners: 0,
    team: 0,
    earnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestOrders, setLatestOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [
        { count: ordersCount },
        { count: partnersCount },
        { count: pendingCount },
        { count: teamCount },
        { data: transData },
        { data: ordersData }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('partners').select('*', { count: 'exact', head: true }),
        supabase.from('partners').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('team').select('*', { count: 'exact', head: true }),
        supabase.from('wallet_transactions').select('amount').gt('amount', 0),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      const totalEarnings = transData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setStats({
        orders: ordersCount || 0,
        partners: partnersCount || 0,
        pendingPartners: pendingCount || 0,
        team: teamCount || 0,
        earnings: totalEarnings
      });
      setLatestOrders(ordersData || []);
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 bg-red-50 rounded-2xl border border-red-100 text-red-700">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-bold">Fehler beim Laden</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={fetchData} className="ml-auto text-sm font-bold underline">Erneut versuchen</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-10">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer"
          onClick={() => router.push('/admin/dashboard/auftraege')}>
          <div className="absolute top-4 right-6 px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kundenaufträge</div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 mb-6 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Anfragen Gesamt</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.orders}</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium italic">Performance Index</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer"
          onClick={() => router.push('/admin/dashboard/partner')}>
          <div className="absolute top-4 right-6 px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">Partnernetzwerk</div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 mb-6 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Live Partner</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.partners}</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium italic">Netzwerk Kapazität</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer"
          onClick={() => router.push('/admin/dashboard/einnahmen')}>
          <div className="absolute top-4 right-6 px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">Finanzen</div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 mb-6 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Umsatz Gesamt</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">€{stats.earnings.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium italic">Netto Auswertung</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer"
          onClick={() => router.push('/admin/dashboard/team')}>
          <div className="absolute top-4 right-6 px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">System</div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 mb-6 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Berechtigungen</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.team}</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium italic">Sicherheitsstatus: OK</p>
          </div>
        </motion.div>
      </div>

      {/* PENDING Partner Banner */}
      {stats.pendingPartners > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-800 text-sm">{stats.pendingPartners} Partner warten auf Freischaltung</p>
              <p className="text-xs text-amber-600">Neue Registrierungen müssen manuell aktiviert werden.</p>
            </div>
          </div>
          <button onClick={() => router.push('/admin/dashboard/partner')}
            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all whitespace-nowrap">
            Jetzt prüfen
          </button>
        </motion.div>
      )}

      {/* Middle Row: Schnellzugriff & Systemstatus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50" />
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-slate-900 rounded-full" />
            Schnellzugriff
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <button onClick={() => router.push('/admin/dashboard/partner')}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 text-left hover:border-slate-900 transition-all group overflow-hidden relative">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">Partner prüfen</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">Registrierungen</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </button>

            <button onClick={() => router.push('/admin/dashboard/einnahmen')}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 text-left hover:border-slate-900 transition-all group overflow-hidden relative">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">Preise anpassen</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">Kalkulation</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </button>

            <button onClick={() => router.push('/admin/dashboard/auftraege')}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 text-left hover:border-slate-900 transition-all group overflow-hidden relative">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">Aufträge verwalten</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">Alle Anfragen</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </button>

            <button onClick={() => router.push('/admin/dashboard/transaktionen')}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 text-left hover:border-slate-900 transition-all group overflow-hidden relative">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">Transaktionen</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">Finanzverlauf</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </motion.div>

        {/* Systemstatus */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Systemstatus</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registrierte Partner</span>
                <span className="text-xs font-bold text-slate-800">{stats.partners} Partner</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-blue rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.partners / 100) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kundenanfragen</span>
                <span className="text-xs font-bold text-slate-800">{stats.orders} Aufträge</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.orders / 500) * 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Datenbank Status</span>
              <span className="text-[10px] font-bold text-[#00b67a] uppercase tracking-widest bg-[#00b67a]/10 px-2 py-0.5 rounded">Verbunden</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Aktuelle Aufträge */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center bg-white">
          <h3 className="text-xl font-bold text-slate-800">Aktuelle Kundenaufträge</h3>
          <button onClick={() => router.push('/admin/dashboard/auftraege')}
            className="text-slate-400 text-[11px] font-bold hover:text-slate-900 transition-colors flex items-center gap-1 uppercase tracking-widest">
            Alle anzeigen <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto px-8 pb-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[25%]">Name / E-Mail</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[15%]">Leistung</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[25%]">Stadt (Von → Nach)</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[15%]">Datum</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[10%]">Status</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[10%] text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {latestOrders.map((order) => (
                <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-6 pr-4">
                    <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{order.customer_email}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{order.customer_phone}</p>
                  </td>
                  <td className="py-6">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      order.service_category === 'PRIVATUMZUG' ? 'bg-brand-blue-soft text-brand-blue' :
                      order.service_category === 'FIRMENUMZUG' ? 'bg-purple-50 text-purple-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {order.service_category}
                    </span>
                  </td>
                  <td className="py-6">
                    <p className="text-sm font-medium text-slate-700">{order.von_city}{order.nach_city ? ` → ${order.nach_city}` : ''}</p>
                  </td>
                  <td className="py-6">
                    <p className="text-sm font-medium text-slate-700">
                      {order.move_date ? new Date(order.move_date).toLocaleDateString('de-DE') : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </td>
                  <td className="py-6">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      order.status === 'Neu' ? 'bg-brand-blue-soft text-brand-blue' :
                      order.status === 'In Bearbeitung' ? 'bg-amber-50 text-amber-600' :
                      order.status === 'Abgeschlossen' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-6 text-right">
                    <button
                      onClick={() => router.push('/admin/dashboard/auftraege')}
                      className="text-[11px] font-bold text-slate-400 hover:text-brand-blue transition-colors flex items-center gap-1 ml-auto whitespace-nowrap">
                      Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {latestOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-sm italic font-medium">
                    Keine aktuellen Kundenaufträge vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
