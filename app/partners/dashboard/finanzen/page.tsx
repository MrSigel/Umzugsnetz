'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { createWalletTopupRequest } from '@/lib/publicForms';
import { DEFAULT_PRICING_CONFIG, getLeadPrice, normalizePricingConfig } from '@/lib/pricing';
import { DEFAULT_BILLING_SETTINGS, normalizeBillingSettings, normalizeNumberSetting } from '@/lib/settings';
import { Wallet, CreditCard, Building, Copy, Check, Info, ShieldCheck, TrendingUp, Clock, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, Plus } from 'lucide-react';

export default function FinancePage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [billingSettings, setBillingSettings] = useState(DEFAULT_BILLING_SETTINGS);
  const [minTopupAmount, setMinTopupAmount] = useState(10);
  const [topupRequests, setTopupRequests] = useState<any[]>([]);

  const quickAmounts = [100, 250, 500, 1000];
  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;

  useEffect(() => { void fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Nicht angemeldet.');
      const [{ data: partnerData, error: partnerError }, { data: transactionData, error: transactionError }, { data: pricingData }, { data: billingData }, { data: minTopupData }] = await Promise.all([
        supabase.from('partners').select('*').eq('user_id', user.id).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('system_settings').select('value').eq('key', 'pricing_config').single(),
        supabase.from('system_settings').select('value').eq('key', 'billing_settings').single(),
        supabase.from('system_settings').select('value').eq('key', 'min_topup_amount').single(),
      ]);
      if (partnerError) throw partnerError;
      if (transactionError) throw transactionError;
      setPartner(partnerData);
      setTransactions(transactionData || []);
      setPricingConfig(normalizePricingConfig(pricingData?.value));
      setBillingSettings(normalizeBillingSettings(billingData?.value));
      setMinTopupAmount(normalizeNumberSetting(minTopupData?.value, 10));

      const { data: requestData } = await supabase.from('wallet_topup_requests').select('*').eq('partner_id', partnerData.id).order('created_at', { ascending: false }).limit(10);
      setTopupRequests(requestData || []);
    } catch (error: any) {
      showToast('error', 'Fehler beim Laden', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTopup() {
    if (!partner) return;
    if (!finalAmount || finalAmount < minTopupAmount) {
      showToast('warning', 'Ungültiger Betrag', `Der Mindestbetrag liegt bei €${minTopupAmount.toFixed(2)}.`);
      return;
    }
    setIsTopupLoading(true);
    try {
      const reference = await createWalletTopupRequest({ userId: partner.user_id, partnerId: partner.id, amount: finalAmount, paymentMethod: 'MANUAL_REVIEW', note: 'Anfrage aus Partner-Dashboard' });
      showToast('success', 'Aufladung angefragt', `Die Anfrage ${reference} wurde gespeichert und an das zuständige Team weitergeleitet.`);
      await fetchAll();
    } catch (error: any) {
      showToast('error', 'Fehler', error.message);
    } finally {
      setIsTopupLoading(false);
    }
  }

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    });
  }

  const totalSpent = useMemo(() => transactions.filter((transaction) => Number(transaction.amount) < 0).reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0), [transactions]);
  const totalReceived = useMemo(() => transactions.filter((transaction) => Number(transaction.amount) > 0).reduce((sum, transaction) => sum + Number(transaction.amount), 0), [transactions]);
  const averageRequestPrice = useMemo(() => {
    const purchases = transactions.filter((transaction) => transaction.type === 'LEAD_PURCHASE');
    if (purchases.length === 0) return 0;
    return purchases.reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0) / purchases.length;
  }, [transactions]);

  const requestPriceLabel = useMemo(() => {
    if (!partner) return 'Lädt...';
    const movePrice = getLeadPrice(pricingConfig, partner.category, 'PRIVATUMZUG');
    const clearancePrice = getLeadPrice(pricingConfig, partner.category, 'ENTRÜMPELUNG');
    return `Umzug €${movePrice.toFixed(2)} / Entrümpelung €${clearancePrice.toFixed(2)}`;
  }, [partner, pricingConfig]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Finanzen & Guthaben</h1>
        <p className="text-slate-400 font-medium text-sm max-w-2xl leading-relaxed">Verwalten Sie Ihr Budget, senden Sie echte Aufladeanfragen und behalten Sie Ihre Konditionen im Blick.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aktuelles Guthaben</p><p className="text-3xl font-black text-brand-blue">€{Number(partner?.balance || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p></div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gesamtausgaben</p><p className="text-3xl font-black text-red-500">€{totalSpent.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p></div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gesamtgutschriften</p><p className="text-3xl font-black text-emerald-500">€{totalReceived.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p></div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ø Anfragepreis</p><p className="text-3xl font-black text-slate-900">€{averageRequestPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 rounded-xl bg-brand-blue-soft flex items-center justify-center text-brand-blue"><Plus className="w-5 h-5" /></div><h3 className="text-xl font-bold text-slate-800">Guthaben aufladen</h3></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {quickAmounts.map((amount) => (
                <button key={amount} onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }} className={`relative p-6 rounded-3xl border-2 transition-all ${selectedAmount === amount && !customAmount ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}>
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedAmount === amount && !customAmount ? 'text-brand-blue' : 'text-slate-400'}`}>Anfrage</div>
                  <div className={`text-xl font-black ${selectedAmount === amount && !customAmount ? 'text-slate-900' : 'text-slate-600'}`}>€ {amount}</div>
                </button>
              ))}
            </div>
            <div className="mb-8">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Anderer Betrag (Min. €{minTopupAmount.toFixed(2)})</label>
              <input type="number" placeholder={String(minTopupAmount)} min={minTopupAmount} value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-5 text-xl font-bold focus:outline-none focus:border-brand-blue focus:bg-white transition-all text-slate-900 placeholder:text-slate-200" />
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-6 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-amber-700 font-medium">Eine Aufladeanfrage wird gespeichert und danach intern bearbeitet.</p></div>
            <button onClick={handleTopup} disabled={isTopupLoading || !finalAmount || finalAmount < minTopupAmount} className="w-full bg-brand-blue text-white py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {isTopupLoading ? 'Wird angefragt...' : `Jetzt €${finalAmount || 0} anfragen`} <CreditCard className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp className="w-5 h-5" /></div><h3 className="text-xl font-bold text-slate-800">Aktuelle Anfrage-Konditionen</h3></div>
            </div>
            <div className="p-8 text-sm text-slate-600">{requestPriceLabel}</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Zusammenfassung</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium">Aktuelles Guthaben</span><span className="text-slate-900 font-bold">€{Number(partner?.balance || 0).toFixed(2)}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium">Gewählter Betrag</span><span className="text-emerald-500 font-bold">+ €{finalAmount || 0}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium">Ø Anfragepreis</span><span className="text-slate-900 font-bold">€{averageRequestPrice.toFixed(2)}</span></div>
            </div>
            <div className="p-5 bg-brand-blue/5 rounded-2xl border border-brand-blue/20"><div className="flex gap-3"><Info className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" /><p className="text-[11px] text-slate-700 leading-relaxed font-medium"><span className="font-bold">Ihre Kondition:</span> {requestPriceLabel}</p></div></div>
            <div className="flex items-center justify-center gap-2 pt-2"><ShieldCheck className="w-4 h-4 text-slate-400" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daten direkt aus Supabase</span></div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl overflow-hidden relative">
            <div className="flex items-center gap-3 relative z-10"><Building className="w-5 h-5 text-brand-blue-2" /><h3 className="text-lg font-bold">Banküberweisung</h3></div>
            <div className="bg-white/5 rounded-3xl p-6 space-y-4 border border-white/10 relative z-10">
              {[{ label: 'Empfänger', value: billingSettings.beneficiary }, { label: 'IBAN', value: billingSettings.iban, copyable: true }, { label: 'BIC', value: billingSettings.bic, copyable: true }].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{item.label}</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-white">{item.value}</span>
                    {item.copyable && <button onClick={() => handleCopy(item.value, item.label)} className="text-white/20 hover:text-white transition-colors p-1">{copiedField === item.label ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6"><Clock className="w-5 h-5 text-slate-400" /><h3 className="text-lg font-bold text-slate-800">Letzte Aufladeanfragen</h3></div>
            <div className="space-y-4">
              {topupRequests.length === 0 ? <p className="text-sm text-slate-400">Noch keine Aufladeanfragen vorhanden.</p> : topupRequests.map((request) => (
                <div key={request.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between gap-3 mb-2"><span className="text-sm font-bold text-slate-800">€{Number(request.amount).toFixed(2)}</span><span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest bg-amber-100 text-amber-600">{request.status}</span></div>
                  <p className="text-[11px] text-slate-500 font-medium">{request.reference}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
