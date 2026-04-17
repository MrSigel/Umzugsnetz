'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { partnerMatchesOrder } from '@/lib/partnerMatching';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Search,
  Inbox,
  Sparkles,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  ShoppingCart,
  BellRing,
  Gauge,
  ReceiptText,
} from 'lucide-react';

export default function PartnerDashboard() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ purchases: 0, totalSpent: 0, openLeads: 0, avgLeadPrice: 0, usageRate: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    let orderChannel: any;
    let transactionChannel: any;
    let purchaseChannel: any;

    if (partner?.id) {
      orderChannel = supabase
        .channel(`partner-dashboard-orders:${partner.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          void fetchData();
        })
        .subscribe();

      transactionChannel = supabase
        .channel(`partner-dashboard-wallet:${partner.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `partner_id=eq.${partner.id}` }, () => {
          void fetchData();
        })
        .subscribe();

      purchaseChannel = supabase
        .channel(`partner-dashboard-purchases:${partner.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_purchases', filter: `partner_id=eq.${partner.id}` }, () => {
          void fetchData();
        })
        .subscribe();
    }

    return () => {
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (transactionChannel) supabase.removeChannel(transactionChannel);
      if (purchaseChannel) supabase.removeChannel(purchaseChannel);
    };
  }, [partner?.id]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Nicht angemeldet.');

      const [{ data: partnerData, error: partnerError }, { data: txData }, { count: purchaseCount }, { data: openOrders, error: openOrdersError }] = await Promise.all([
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
        .filter((transaction: any) => transaction.type === 'LEAD_PURCHASE' || transaction.type === 'DEBIT')
        .reduce((acc: number, transaction: any) => acc + Math.abs(Number(transaction.amount)), 0);

      const matchingOpenLeads = (openOrders || []).filter((order: any) => partnerMatchesOrder(partnerData, order));
      const averageLeadPrice = purchaseCount ? totalSpent / purchaseCount : 0;
      const usageRate = purchaseCount || matchingOpenLeads.length
        ? (Number(purchaseCount || 0) / (Number(purchaseCount || 0) + matchingOpenLeads.length)) * 100
        : 0;

      setStats({
        purchases: purchaseCount || 0,
        totalSpent,
        openLeads: matchingOpenLeads.length,
        avgLeadPrice: averageLeadPrice,
        usageRate,
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
        <button onClick={() => void fetchData()} className="ml-auto text-sm font-bold underline">Erneut versuchen</button>
      </div>
    );
  }

  const isActive = partner?.status === 'ACTIVE';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Willkommen zurück, {partner?.name || 'Partner'}</h1>
        <p className="text-slate-400 font-medium text-sm">Übersicht über Guthaben, gekaufte Leads und Transaktionen</p>
      </div>

      {!isActive && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4 text-amber-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Account ausstehend / gesperrt</p>
            <p className="text-[11px] font-medium opacity-80">Ihr Account hat den Status "{partner?.status}". Bitte kontaktieren Sie den Admin.</p>
          </div>
        </motion.div>
      )}

      {isActive && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4 text-emerald-700">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Account aktiv</p>
            <p className="text-[11px] font-medium opacity-80">Tarif: {partner?.category || 'Standard'} | Offene Leads: {stats.openLeads} | Regionen: {partner?.regions || 'Nicht angegeben'}</p>
          </div>
          <button onClick={() => router.push('/partners/dashboard/anfragen')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
            <ShoppingCart className="w-3.5 h-3.5" />
            Marktplatz
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live-Übersicht</p>
              <h2 className="text-xl font-black text-slate-900 mt-1">Ihr Partnerstatus heute</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              <BellRing className="w-3.5 h-3.5" />
              Realtime aktiv
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue-soft text-brand-blue flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Offene Leads</p>
                  <p className="text-2xl font-black text-slate-900">{stats.openLeads}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">Passende Anfragen, die aktuell zu Ihrem Profil verfügbar sind.</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ø Leadpreis</p>
                  <p className="text-2xl font-black text-slate-900">€{stats.avgLeadPrice.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">Durchschnitt auf Basis Ihrer bisherigen Lead-Käufe.</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nutzungsquote</p>
                  <p className="text-2xl font-black text-slate-900">{Math.round(stats.usageRate)}%</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">Verhältnis aus gekauften Leads zu aktuell verfügbaren Chancen.</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nächster sinnvoller Schritt</p>
          <h2 className="text-xl font-black text-slate-900 mt-1 mb-4">Was Sie jetzt tun sollten</h2>
          <div className="space-y-3 text-sm">
            {stats.openLeads > 0 ? (
              <button onClick={() => router.push('/partners/dashboard/anfragen')} className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 text-left hover:bg-brand-blue/10 transition-colors">
                <p className="font-bold text-brand-blue">Offene Leads prüfen</p>
                <p className="text-slate-600 mt-1">Es warten {stats.openLeads} passende Anfragen im Marktplatz.</p>
              </button>
            ) : (
              <button onClick={() => void fetchData()} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left hover:bg-slate-100 transition-colors">
                <p className="font-bold text-slate-800">Marktplatz aktualisieren</p>
                <p className="text-slate-500 mt-1">Momentan gibt es keine neuen Treffer. Ein Update prüft neue Anfragen.</p>
              </button>
            )}

            {Number(partner?.balance || 0) < Math.max(stats.avgLeadPrice || 0, 25) ? (
              <button onClick={() => router.push('/partners/dashboard/finanzen')} className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left hover:bg-amber-100 transition-colors">
                <p className="font-bold text-amber-700">Guthaben erhöhen</p>
                <p className="text-slate-600 mt-1">Ihr Wallet liegt unter Ihrem typischen Leadpreis. Eine Aufladung verhindert Kaufabbrüche.</p>
              </button>
            ) : (
              <button onClick={() => router.push('/partners/dashboard/transaktionen')} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left hover:bg-slate-100 transition-colors">
                <p className="font-bold text-slate-800">Transaktionen prüfen</p>
                <p className="text-slate-500 mt-1">Behalten Sie Käufe, Gutschriften und Ihren Verlauf im Blick.</p>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-48 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verfügbares Guthaben</span>
            <div className="w-10 h-10 rounded-xl bg-brand-blue-soft text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-slate-900 tabular-nums">€{Number(partner?.balance || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</h3>
            <button onClick={() => router.push('/partners/dashboard/finanzen')} className="w-full mt-4 bg-brand-blue text-white py-2.5 rounded-full font-bold text-xs hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/10">
              Guthaben & Finanzen
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-48 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gekaufte Leads</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Search className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-slate-900">{stats.purchases}</h3>
            <button onClick={() => router.push('/partners/dashboard/anfragen')} className="w-full mt-4 bg-white border border-slate-100 text-slate-500 py-2.5 rounded-full font-bold text-xs hover:bg-slate-50 transition-all">
              Marktplatz öffnen
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-48 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gesamtausgaben</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-slate-900">€{stats.totalSpent.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</h3>
            <button onClick={() => router.push('/partners/dashboard/finanzen')} className="w-full mt-4 bg-white border border-slate-100 text-slate-500 py-2.5 rounded-full font-bold text-xs hover:bg-slate-50 transition-all">
              Details anzeigen
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Letzte Transaktionen</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => void fetchData()} className="p-2 text-slate-400 hover:text-brand-blue transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => router.push('/partners/dashboard/finanzen')} className="text-xs font-bold text-slate-400 hover:text-brand-blue transition-colors uppercase tracking-widest">
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
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed font-semibold">Ihr Transaktionsverlauf erscheint hier, sobald Sie Kundenaufträge im Marktplatz kaufen oder Guthaben erhalten.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => router.push('/partners/dashboard/anfragen')} className="px-6 py-3 bg-brand-blue text-white rounded-2xl font-bold text-sm hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/10">Zum Marktplatz</button>
              <button onClick={() => router.push('/partners/dashboard/finanzen')} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">Guthaben aufladen</button>
            </div>
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
                    <p className="text-sm font-bold text-slate-800">{tx.description || (tx.type === 'LEAD_PURCHASE' ? 'Lead gekauft' : tx.type === 'ADMIN_CREDIT' ? 'Admin-Gutschrift' : tx.type)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(tx.created_at).toLocaleString('de-DE')}</p>
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
