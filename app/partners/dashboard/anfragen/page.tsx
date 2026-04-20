'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { partnerMatchesOrder } from '@/lib/partnerMatching';
import { DEFAULT_PRICING_CONFIG, getLeadPrice, normalizePricingConfig } from '@/lib/pricing';
import { Search, Truck, Package, RefreshCw, Clock, ShieldCheck, ShoppingBag, Inbox, CheckCircle2, X, MapPin, Gauge, ReceiptText, Gift } from 'lucide-react';

type Tab = 'available' | 'purchased';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `Vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Vor ${hours} Std.`;
  return `Vor ${Math.floor(hours / 24)} Tagen`;
}

export default function MarketplacePage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [partner, setPartner] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOrder, setConfirmOrder] = useState<any | null>(null);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [tabCounts, setTabCounts] = useState({ available: 0, purchased: 0 });

  useEffect(() => {
    void fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Nicht angemeldet.');

      const [{ data: partnerData, error: partnerError }, { data: pricingData }] = await Promise.all([
        supabase.from('partners').select('*').eq('user_id', user.id).single(),
        supabase.from('system_settings').select('value').eq('key', 'pricing_config').single(),
      ]);

      if (partnerError) throw partnerError;

      setPartner(partnerData);
      setPricingConfig(normalizePricingConfig(pricingData?.value));

      const { data: purchaseRows, error: purchaseError } = await supabase
        .from('partner_purchases')
        .select('order_id')
        .eq('partner_id', partnerData.id);

      if (purchaseError) throw purchaseError;

      const purchasedIds = purchaseRows?.map((purchase) => purchase.order_id) || [];
      setTabCounts((current) => ({ ...current, purchased: purchasedIds.length }));

      if (activeTab === 'available') {
        const { data: rawOrders, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'Neu')
          .order('created_at', { ascending: false });

        if (orderError) throw orderError;

        const matchingOrders = (rawOrders || [])
          .filter((order) => !purchasedIds.includes(order.id))
          .filter((order) => partnerMatchesOrder(partnerData, order));

        setOrders(matchingOrders);
        setTabCounts((current) => ({ ...current, available: matchingOrders.length }));
      } else if (purchasedIds.length > 0) {
        const { data: purchasedOrders, error: purchasedOrderError } = await supabase
          .from('orders')
          .select('*')
          .in('id', purchasedIds);

        if (purchasedOrderError) throw purchasedOrderError;
        setOrders(purchasedOrders || []);
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      showToast('error', 'Fehler beim Laden', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchaseConfirm() {
    if (!partner || !confirmOrder) return;

    const price = getLeadPrice(pricingConfig, partner.category, confirmOrder.service_category);
    const hasBonusToken = Number(partner.bonus_tokens || 0) > 0;

    if (Number(partner.balance) < price && !hasBonusToken) {
      showToast(
        'warning',
        'Nicht genügend Guthaben',
        `Sie benötigen EUR ${price.toFixed(2)}, haben aber nur EUR ${Number(partner.balance).toFixed(2)}.`,
      );
      setConfirmOrder(null);
      return;
    }

    setPurchasing(confirmOrder.id);
    setConfirmOrder(null);

    try {
      const { error } = await supabase.rpc('purchase_lead', {
        order_id_param: confirmOrder.id,
        partner_id_param: partner.id,
        price_param: price,
      });

      if (error) throw error;

      showToast(
        'success',
        'Kundenanfrage freigeschaltet',
        hasBonusToken
          ? 'Ein Startbonus-Token wurde eingelöst. Die vollständigen Kontaktdaten sind jetzt sichtbar.'
          : 'Die vollständigen Kontaktdaten sind jetzt sichtbar.',
      );

      await fetchData();
    } catch (error: any) {
      showToast('error', 'Fehler bei der Freischaltung', error.message);
    } finally {
      setPurchasing(null);
    }
  }

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter((order) =>
      order.von_city?.toLowerCase().includes(term) ||
      order.nach_city?.toLowerCase().includes(term) ||
      order.service_category?.toLowerCase().includes(term),
    );
  }, [orders, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 font-sans">
      {confirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">Kundenanfrage freischalten</h3>
              <button type="button" onClick={() => setConfirmOrder(null)} className="rounded-xl p-2 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="mb-6 space-y-3 rounded-2xl bg-slate-50 p-5">
              <div className="flex justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Strecke</span>
                <span className="text-sm font-bold text-slate-800">
                  {confirmOrder.von_city}
                  {confirmOrder.nach_city ? ` -> ${confirmOrder.nach_city}` : ''}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Freischaltpreis</span>
                <span className="text-lg font-black text-brand-blue">
                  EUR {getLeadPrice(pricingConfig, partner?.category, confirmOrder.service_category).toFixed(2)}
                </span>
              </div>
              {Number(partner?.bonus_tokens || 0) > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Für diese Freischaltung wird automatisch ein Startbonus-Token verwendet. Verbleibend nach dem Kauf: {Math.max(Number(partner?.bonus_tokens || 0) - 1, 0)}.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmOrder(null)} className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200">
                Abbrechen
              </button>
              <button type="button" onClick={handlePurchaseConfirm} className="flex-1 rounded-2xl bg-brand-blue py-3 text-sm font-bold text-white shadow-lg shadow-brand-blue/20 transition-colors hover:bg-brand-blue-hover">
                Jetzt freischalten
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-800">Marktplatz</h1>
          <p className="text-sm font-medium text-slate-400">Passende Kundenanfragen für Ihr Profil und Ihre Regionen.</p>
        </div>
        <button type="button" onClick={() => void fetchData()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Aktualisieren
        </button>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
        <div className="flex w-full rounded-2xl bg-slate-100 p-1.5 lg:w-auto">
          <button type="button" onClick={() => setActiveTab('available')} className={`flex-1 rounded-xl px-8 py-3 text-xs font-bold transition-all lg:flex-none ${activeTab === 'available' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Offene Anfragen ({tabCounts.available})
          </button>
          <button type="button" onClick={() => setActiveTab('purchased')} className={`flex-1 rounded-xl px-8 py-3 text-xs font-bold transition-all lg:flex-none ${activeTab === 'purchased' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Freigeschaltet ({tabCounts.purchased})
          </button>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Stadt oder Leistung..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs text-black transition-all focus:border-brand-blue focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passende Kundenanfragen</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{tabCounts.available}</p>
        </div>
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Freigeschaltete Anfragen</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{tabCounts.purchased}</p>
        </div>
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bonus-Token</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{Number(partner?.bonus_tokens || 0)}</p>
          <p className="mt-2 text-xs text-slate-500">Bei vorhandenen Token ist die nächste Freischaltung kostenfrei.</p>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-slate-100 bg-white p-20">
            <RefreshCw className="mb-4 h-8 w-8 animate-spin text-brand-blue" />
            <p className="text-sm italic text-slate-400">Lade Marktplatz...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {filteredOrders.map((order) => {
              const price = getLeadPrice(pricingConfig, partner?.category, order.service_category);
              const isPurchasing = purchasing === order.id;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
                  <div className="flex-1 p-8">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${order.service_category === 'ENTRÜMPELUNG' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-blue-soft text-brand-blue'}`}>
                          {order.service_category === 'ENTRÜMPELUNG' ? <Package className="h-6 w-6" /> : <Truck className="h-6 w-6" />}
                        </div>
                        <div>
                          <h3 className="text-xl font-black tracking-tight text-slate-800">
                            {order.von_city}
                            {order.nach_city ? ` -> ${order.nach_city}` : ''}
                          </h3>
                          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{order.service_category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-xl font-black text-slate-900">
                          {Number(partner?.bonus_tokens || 0) > 0 ? 'Token' : `EUR ${price.toFixed(2)}`}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Freischaltung</span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400"><MapPin className="h-3 w-3" /> Strecke</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{order.von_city || 'Unbekannt'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400"><ReceiptText className="h-3 w-3" /> Kategorie</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{order.service_category}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {Number(partner?.bonus_tokens || 0) > 0 ? <Gift className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                          Freischaltung
                        </p>
                        <p className="mt-1 text-sm font-bold text-brand-blue">
                          {Number(partner?.bonus_tokens || 0) > 0 ? 'Startbonus-Token' : `EUR ${price.toFixed(2)}`}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400"><Gauge className="h-3 w-3" /> Eingang</p>
                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">{timeAgo(order.created_at)}</span>
                      </div>
                    </div>

                    {activeTab === 'purchased' && (
                      <div className="mt-5 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Kontaktdaten freigeschaltet</p>
                        <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                        <p className="text-sm font-medium text-brand-blue">{order.customer_email}</p>
                        <p className="text-sm font-medium text-slate-600">{order.customer_phone}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-4 w-4" />
                      <span className="font-mono text-[10px] font-medium">{timeAgo(order.created_at)}</span>
                    </div>
                    {activeTab === 'available' ? (
                      <button type="button" onClick={() => setConfirmOrder(order)} disabled={isPurchasing} className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-black/5 transition-all hover:bg-brand-blue disabled:opacity-50">
                        {isPurchasing ? (<><RefreshCw className="h-4 w-4 animate-spin" /> Lädt...</>) : (<>Details & Freischalten <ShoppingBag className="h-4 w-4" /></>)}
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Freigeschaltet</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-slate-100 bg-white p-20 text-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-slate-50 bg-slate-50 text-slate-200">
              <Inbox className="h-12 w-12" strokeWidth={1} />
            </div>
            <h3 className="mb-4 text-2xl font-black tracking-tight text-slate-800">
              {activeTab === 'available' ? 'Aktuell keine passenden Kundenanfragen' : 'Noch keine Anfragen freigeschaltet'}
            </h3>
            <p className="max-w-md text-sm font-medium leading-relaxed text-slate-400">
              {activeTab === 'available'
                ? 'Neue Kundenanfragen erscheinen automatisch, sobald sie zu Ihrem Profil passen.'
                : 'Freigeschaltete Kundenanfragen erscheinen hier mit vollständigen Kontaktdaten.'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pt-10 text-slate-300">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">100% verifizierte Anfragen • direkt mit Ihrem Partnerprofil abgeglichen</span>
      </div>
    </div>
  );
}
