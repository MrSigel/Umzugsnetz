'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { createWalletTopupRequest } from '@/lib/publicForms';
import { DEFAULT_PRICING_CONFIG, getLeadPrice, normalizePricingConfig } from '@/lib/pricing';
import { DEFAULT_BILLING_SETTINGS, normalizeBillingSettings, normalizeNumberSetting } from '@/lib/settings';
import {
  Wallet,
  CreditCard,
  Building,
  Copy,
  Check,
  Info,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Plus,
} from 'lucide-react';

type TopupRequest = {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  reference: string;
  created_at: string;
};

export default function FinancePage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [billingSettings, setBillingSettings] = useState(DEFAULT_BILLING_SETTINGS);
  const [minTopupAmount, setMinTopupAmount] = useState(10);
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);

  const quickAmounts = [100, 250, 500, 1000];
  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Nicht angemeldet.');
      }

      const [
        { data: partnerData, error: partnerError },
        { data: transactionData, error: transactionError },
        { data: pricingData },
        { data: billingData },
        { data: minTopupData },
      ] = await Promise.all([
        supabase.from('partners').select('*').eq('user_id', user.id).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('system_settings').select('value').eq('key', 'pricing_config').single(),
        supabase.from('system_settings').select('value').eq('key', 'billing_settings').single(),
        supabase.from('system_settings').select('value').eq('key', 'min_topup_amount').single(),
      ]);

      if (partnerError) {
        throw partnerError;
      }

      if (transactionError) {
        throw transactionError;
      }

      setPartner(partnerData);
      setTransactions(transactionData || []);
      setPricingConfig(normalizePricingConfig(pricingData?.value));
      setBillingSettings(normalizeBillingSettings(billingData?.value));
      setMinTopupAmount(normalizeNumberSetting(minTopupData?.value, 10));

      if (partnerData?.id) {
        const { data: requestData, error: requestError } = await supabase
          .from('wallet_topup_requests')
          .select('*')
          .eq('partner_id', partnerData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (requestError) {
          throw requestError;
        }

        setTopupRequests((requestData || []).map((request) => ({
          ...request,
          amount: Number(request.amount),
        })));
      }
    } catch (error: any) {
      showToast('error', 'Fehler beim Laden', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactions() {
    setTxLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Nicht angemeldet.');
      }

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setTransactions(data || []);
      showToast('success', 'Aktualisiert', 'Der Transaktionsverlauf wurde neu geladen.');
    } catch (error: any) {
      showToast('error', 'Fehler', error.message);
    } finally {
      setTxLoading(false);
    }
  }

  async function handleTopup() {
    if (!partner) {
      return;
    }

    if (!finalAmount || finalAmount < minTopupAmount) {
      showToast('warning', 'Ungültiger Betrag', `Der Mindestbetrag liegt bei €${minTopupAmount.toFixed(2)}.`);
      return;
    }

    setIsTopupLoading(true);

    try {
      const reference = await createWalletTopupRequest({
        userId: partner.user_id,
        partnerId: partner.id,
        amount: finalAmount,
        paymentMethod: 'MANUAL_REVIEW',
        note: 'Anfrage aus Partner-Dashboard',
      });

      showToast('success', 'Aufladung angefragt', `Die Anfrage ${reference} wurde gespeichert und an das Admin-Team weitergeleitet.`);
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
      showToast('success', 'Kopiert', `${field} wurde in die Zwischenablage kopiert.`);
      window.setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      showToast('error', 'Kopieren fehlgeschlagen');
    });
  }

  const totalSpent = useMemo(() => transactions
    .filter((transaction) => Number(transaction.amount) < 0)
    .reduce((accumulator, transaction) => accumulator + Math.abs(Number(transaction.amount)), 0), [transactions]);

  const totalReceived = useMemo(() => transactions
    .filter((transaction) => Number(transaction.amount) > 0)
    .reduce((accumulator, transaction) => accumulator + Number(transaction.amount), 0), [transactions]);

  const leadPriceLabel = useMemo(() => {
    if (!partner) {
      return 'Lädt...';
    }

    const movePrice = getLeadPrice(pricingConfig, partner.category, 'PRIVATUMZUG');
    const clearancePrice = getLeadPrice(pricingConfig, partner.category, 'ENTRÜMPELUNG');

    if (partner.service === 'UMZUG') {
      return `€${movePrice.toFixed(2)} pro Umzugsanfrage`;
    }

    if (partner.service === 'ENTRÜMPELUNG') {
      return `€${clearancePrice.toFixed(2)} pro Entrümpelungsanfrage`;
    }

    return `Umzug €${movePrice.toFixed(2)} / Entrümpelung €${clearancePrice.toFixed(2)}`;
  }, [partner, pricingConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Finanzen & Guthaben</h1>
        <p className="text-slate-400 font-medium text-sm max-w-2xl leading-relaxed">
          Verwalten Sie Ihr Budget, senden Sie echte Aufladeanfragen und behalten Sie Ihre Konditionen im Blick.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aktuelles Guthaben</p>
          <p className="text-3xl font-black text-brand-blue">€{Number(partner?.balance || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gesamtausgaben</p>
          <p className="text-3xl font-black text-red-500">€{totalSpent.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gesamtgutschriften</p>
          <p className="text-3xl font-black text-emerald-500">€{totalReceived.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand-blue-soft flex items-center justify-center text-brand-blue">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Guthaben aufladen</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                    className={`relative p-6 rounded-3xl border-2 transition-all ${
                      selectedAmount === amount && !customAmount
                      ? 'border-brand-blue bg-brand-blue/5'
                      : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'
                    }`}
                  >
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                     selectedAmount === amount && !customAmount ? 'text-brand-blue' : 'text-slate-400'
                    }`}>Anfrage</div>
                  <div className={`text-xl font-black ${
                    selectedAmount === amount && !customAmount ? 'text-slate-900' : 'text-slate-600'
                  }`}>€ {amount}</div>
                   {selectedAmount === amount && !customAmount && (
                     <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-brand-blue rounded-full flex items-center justify-center text-white">
                        <Check className="w-3 h-3" />
                      </div>
                     </div>
                   )}
                </button>
              ))}
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                Anderer Betrag (Min. €{minTopupAmount.toFixed(2)})
              </label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-300 group-focus-within:text-brand-blue transition-colors">€</div>
                <input
                  type="number"
                  placeholder={String(minTopupAmount)}
                  min={minTopupAmount}
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-5 text-xl font-bold focus:outline-none focus:border-brand-blue focus:bg-white transition-all text-slate-900 placeholder:text-slate-200"
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">
                Statt eines Mock-Buttons wird jetzt eine echte Aufladeanfrage gespeichert. Das Admin-Team prüft diese und bucht das Guthaben anschließend auf Ihr Wallet.
              </p>
            </div>

            <button
              onClick={handleTopup}
              disabled={isTopupLoading || !finalAmount || finalAmount < minTopupAmount}
              className="w-full bg-brand-blue text-white py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-brand-blue/20 hover:bg-brand-blue-hover hover:scale-[1.01] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isTopupLoading ? 'Wird angefragt...' : `Jetzt €${finalAmount || 0} anfragen`}
              <CreditCard className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Aktuelle Lead-Konditionen</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aus `system_settings`</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategorie</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Umzug</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Entrümpelung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pricingConfig.umzug.map((moveTier) => {
                    const clearanceTier = pricingConfig.entruempelung.find((item) => item.id === moveTier.id) || moveTier;
                    const isActive = partner?.category === moveTier.alias;

                    return (
                      <tr key={moveTier.id} className={`hover:bg-slate-50/50 transition-colors ${isActive ? 'bg-brand-blue/5' : ''}`}>
                        <td className="px-8 py-6 font-bold text-slate-700">
                          {moveTier.alias}
                            {isActive && (
                            <span className="ml-3 text-[9px] bg-brand-blue text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Aktuell</span>
                            )}
                        </td>
                        <td className="px-8 py-6 text-right font-black text-slate-800">€{moveTier.price.toFixed(2)}</td>
                        <td className="px-8 py-6 text-right font-black text-slate-800">€{clearanceTier.price.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Transaktionsverlauf</h3>
              </div>
              <button
                onClick={fetchTransactions}
                disabled={txLoading}
                className="text-[10px] font-bold text-brand-blue uppercase tracking-widest hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${txLoading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Datum</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Typ / Beschreibung</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Betrag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.map((transaction) => {
                    const isCredit = Number(transaction.amount) > 0;
                    const typeLabel = transaction.type === 'TOPUP'
                      ? 'Aufladung'
                      : transaction.type === 'LEAD_PURCHASE'
                        ? 'Lead-Kauf'
                        : transaction.type === 'ADMIN_CREDIT'
                          ? 'Admin-Gutschrift'
                          : transaction.type;

                    return (
                      <tr key={transaction.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm text-slate-500 font-medium">{new Date(transaction.created_at).toLocaleDateString('de-DE')}</p>
                          <p className="text-[10px] text-slate-300">{new Date(transaction.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-400'}`}>
                              {isCredit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{typeLabel}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{transaction.description || 'Systembuchung'}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-8 py-5 text-right font-black ${isCredit ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isCredit ? '+' : '-'}€{Math.abs(Number(transaction.amount)).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center text-slate-400 italic text-sm">
                        Noch keine Transaktionen vorhanden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Zusammenfassung</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Aktuelles Guthaben</span>
                <span className="text-slate-900 font-bold">€{Number(partner?.balance || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Gewählter Betrag</span>
                <span className="text-emerald-500 font-bold">+ €{finalAmount || 0}</span>
              </div>
              <div className="h-px bg-slate-50 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-slate-900 font-black">Neu Gesamt</span>
                <span className="text-2xl font-black text-brand-blue">
                  €{((Number(partner?.balance) || 0) + (finalAmount || 0)).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="p-5 bg-brand-blue/5 rounded-2xl border border-brand-blue/20">
              <div className="flex gap-3">
                <Info className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                  <span className="font-bold">Ihre Kondition:</span> {leadPriceLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daten direkt aus Supabase</span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="flex items-center gap-3 relative z-10">
              <Building className="w-5 h-5 text-brand-blue-2" />
              <h3 className="text-lg font-bold">Banküberweisung</h3>
            </div>
            <div className="bg-white/5 rounded-3xl p-6 space-y-4 border border-white/10 relative z-10">
              {[
                { label: 'Empfänger', value: billingSettings.beneficiary },
                { label: 'IBAN', value: billingSettings.iban, copyable: true },
                { label: 'BIC', value: billingSettings.bic, copyable: true },
                { label: 'Verwendungszweck', value: `Partner-ID: ${partner?.id?.slice(0, 8) || '—'}`, highlight: true },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{item.label}</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm font-bold ${item.highlight ? 'text-brand-blue-2' : 'text-white'}`}>{item.value}</span>
                    {item.copyable && (
                      <button onClick={() => handleCopy(item.value, item.label)} className="text-white/20 hover:text-white transition-colors p-1">
                        {copiedField === item.label ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 relative z-10">
              <Info className="w-5 h-5 text-white/20 flex-shrink-0" />
              <p className="text-[10px] text-white/50 leading-relaxed font-medium">{billingSettings.note}</p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-800">Letzte Aufladeanfragen</h3>
            </div>
            <div className="space-y-4">
              {topupRequests.length === 0 ? (
                <p className="text-sm text-slate-400">Noch keine Aufladeanfragen vorhanden.</p>
              ) : topupRequests.map((request) => (
                <div key={request.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-bold text-slate-800">€{request.amount.toFixed(2)}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${
                      request.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-600'
                        : request.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-500'
                          : 'bg-amber-100 text-amber-600'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">{request.reference}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(request.created_at).toLocaleString('de-DE')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
