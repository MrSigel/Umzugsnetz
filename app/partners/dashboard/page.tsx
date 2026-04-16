'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { partnerMatchesOrder } from '@/lib/partnerMatching';
import { useRouter } from 'next/navigation';
import { 
  Wallet, 
  Search, 
  Calendar, 
  Inbox, 
  Sparkles,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';

export default function PartnerDashboard() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ purchases: 0, totalSpent: 0, openLeads: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Nicht angemeldet.');

      const [
        { data: partnerData, error: partnerError },
        { data: txData, error: txError },
        { count: purchaseCount, error: purchaseError },
        { data: openOrders, error: openOrdersError },
      ] = await Promise.all([
        supabase.from('partners').select('*').eq('user_id', user.id).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('partner_purchases').select('*', { count: 'exact', head: true }).eq('partner_id', (await supabase.from('partners').select('id').eq('user_id', user.id).single()).data?.id || ''),
        supabase.from('orders').select('*').eq('status', 'Neu').order('created_at', { ascending: false }),
      ]);

      if (partnerError) throw partnerError;
      if (openOrdersError) throw openOrdersError;
      setPartner(partnerData);

      const txList = txData || [];
      setTransactions(txList);

      const totalSpent = txList
        .filter((t: any) => t.type === 'LEAD_PURCHASE' || t.type === 'DEBIT')
        .reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount)), 0);

      const matchingOpenLeads = (openOrders || []).filter((order: any) => partnerMatchesOrder(partnerData, order));

      setStats({
        purchases: purchaseCount || 0,
        totalSpent,
        openLeads: matchingOpenLeads.length
      });
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler');
      showToast('error', 'Fehler beim Laden', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#0075c9] border-t-transparent rounded-full animate-spin" />
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

  const isActive = partner?.status === 'ACTIVE';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 font-sans">
      {/* Page Title */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
          Willkommen zurück, {partner?.name || 'Partner'}
        </h1>
        <p className="text-slate-400 font-medium text-sm">
          Übersicht über Guthaben, gekaufte Leads und Transaktionen
        </p>
      </div>

      {/* Status Banner */}
      {!isActive && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4 text-amber-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Account ausstehend / gesperrt</p>
            <p className="text-[11px] font-medium opacity-80">
              Ihr Account hat den Status "{partner?.status}". Bitte kontaktieren Sie den Admin.
            </p>
          </div>
        </motion.div>
      )}

      {isActive && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4 text-emerald-700">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Account aktiv</p>
            <p className="text-[11px] font-medium opacity-80">
              Tarif: {partner?.category || 'Standard'} | Offene Leads: {stats.openLeads} | Regionen: {partner?.regions || 'Nicht angegeben'}
            </p>
          </div>
          <button onClick={() => router.push('/partners/dashboard/anfragen')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
            <ShoppingCart className="w-3.5 h-3.5" />
            Marktplatz
          </button>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-48 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verfügbares Guthaben</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0075c9] flex items-center justify-center group-hover:bg-[#0075c9] group-hover:text-white transition-all">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-slate-900 tabular-nums">
              €{Number(partner?.balance || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
            </h3>
            <button onClick={() => router.push('/partners/dashboard/finanzen')}
              className="w-full mt-4 bg-[#0075c9] text-white py-2.5 rounded-full font-bold text-xs hover:bg-[#005ea6] transition-all shadow-lg shadow-blue-500/10">
              Guthaben & Finanzen
            </button>
          </div>
        </div>

        {/* Gekaufte Leads */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-48 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gekaufte Leads</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Search className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-slate-900">{stats.purchases}</h3>
            <button onClick={() => router.push('/partners/dashboard/anfragen')}
              className="w-full mt-4 bg-white border border-slate-100 text-slate-500 py-2.5 rounded-full font-bold text-xs hover:bg-slate-50 transition-all">
              Marktplatz öffnen
            </button>
          </div>
        </div>

        {/* Ausgaben */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-48 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gesamtausgaben</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-slate-900">
              €{stats.totalSpent.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
            </h3>
            <button onClick={() => router.push('/partners/dashboard/finanzen')}
              className="w-full mt-4 bg-white border border-slate-100 text-slate-500 py-2.5 rounded-full font-bold text-xs hover:bg-slate-50 transition-all">
              Details anzeigen
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Letzte Transaktionen</h3>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2 text-slate-400 hover:text-[#0075c9] transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => router.push('/partners/dashboard/finanzen')}
              className="text-xs font-bold text-slate-400 hover:text-[#0075c9] transition-colors uppercase tracking-widest">
              Alle anzeigen →
            </button>
          </div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-50/10">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
              <Inbox className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-700 mb-2">Noch keine Aktivität</h4>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed font-semibold">
              Ihr Transaktionsverlauf erscheint hier, sobald Sie Kundenaufträge im Marktplatz kaufen oder Guthaben erhalten.
            </p>
            <button onClick={() => router.push('/partners/dashboard/anfragen')}
              className="mt-6 px-6 py-3 bg-[#0075c9] text-white rounded-2xl font-bold text-sm hover:bg-[#005ea6] transition-all shadow-lg shadow-blue-500/10">
              Zum Marktplatz
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map((tx: any) => {
              const isCredit = tx.type === 'ADMIN_CREDIT' || tx.type === 'CREDIT' || Number(tx.amount) > 0;
              return (
                <div key={tx.id} className="flex items-center gap-4 px-8 py-5 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-400'}`}>
                    {isCredit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      {tx.description || (tx.type === 'LEAD_PURCHASE' ? 'Lead gekauft' : tx.type === 'ADMIN_CREDIT' ? 'Admin-Gutschrift' : tx.type)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <span className={`text-sm font-black tabular-nums ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : '-'}€{Math.abs(Number(tx.amount)).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
