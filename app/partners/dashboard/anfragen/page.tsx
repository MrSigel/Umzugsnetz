'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { partnerMatchesOrder } from '@/lib/partnerMatching';
import { DEFAULT_PRICING_CONFIG, getLeadPrice, normalizePricingConfig } from '@/lib/pricing';
import { Search, Calendar, Truck, Package, RefreshCw, Clock, ShieldCheck, ShoppingBag, Inbox, CheckCircle2, X, MapPin, Gauge, ReceiptText } from 'lucide-react';

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

  useEffect(() => { void fetchData(); }, [activeTab]);

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
        const { data: rawOrders, error: orderError } = await supabase.from('orders').select('*').eq('status', 'Neu').order('created_at', { ascending: false });
        if (orderError) throw orderError;
        const matchingOrders = (rawOrders || []).filter((order) => !purchasedIds.includes(order.id)).filter((order) => partnerMatchesOrder(partnerData, order));
        setOrders(matchingOrders);
        setTabCounts((current) => ({ ...current, available: matchingOrders.length }));
      } else if (purchasedIds.length > 0) {
        const { data: purchasedOrders, error: purchasedOrderError } = await supabase.from('orders').select('*').in('id', purchasedIds);
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
    if (Number(partner.balance) < price) {
      showToast('warning', 'Nicht genügend Guthaben', `Sie benötigen €${price.toFixed(2)}, haben aber nur €${Number(partner.balance).toFixed(2)}.`);
      setConfirmOrder(null);
      return;
    }
    setPurchasing(confirmOrder.id);
    setConfirmOrder(null);
    try {
      const { error } = await supabase.rpc('purchase_lead', { order_id_param: confirmOrder.id, partner_id_param: partner.id, price_param: price });
      if (error) throw error;
      showToast('success', 'Kundenanfrage freigeschaltet', 'Die vollständigen Kontaktdaten sind jetzt sichtbar.');
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">Kundenanfrage freischalten</h3>
              <button onClick={() => setConfirmOrder(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex justify-between"><span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Strecke</span><span className="text-sm font-bold text-slate-800">{confirmOrder.von_city}{confirmOrder.nach_city ? ` → ${confirmOrder.nach_city}` : ''}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Freischaltpreis</span><span className="text-lg font-black text-brand-blue">€{getLeadPrice(pricingConfig, partner?.category, confirmOrder.service_category).toFixed(2)}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOrder(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors">Abbrechen</button>
              <button onClick={handlePurchaseConfirm} className="flex-1 py-3 bg-brand-blue text-white rounded-2xl font-bold text-sm hover:bg-brand-blue-hover transition-colors shadow-lg shadow-brand-blue/20">Jetzt freischalten</button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Marktplatz</h1>
          <p className="text-slate-400 font-medium text-sm">Passende Kundenanfragen für Ihr Profil und Ihre Regionen.</p>
        </div>
        <button onClick={() => void fetchData()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Aktualisieren
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto">
          <button onClick={() => setActiveTab('available')} className={`flex-1 lg:flex-none px-8 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'available' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Offene Anfragen ({tabCounts.available})</button>
          <button onClick={() => setActiveTab('purchased')} className={`flex-1 lg:flex-none px-8 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'purchased' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Freigeschaltet ({tabCounts.purchased})</button>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Stadt oder Leistung..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-brand-blue transition-all text-black" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passende Kundenanfragen</p><p className="text-3xl font-black text-slate-900 mt-2">{tabCounts.available}</p></div>
        <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Freigeschaltete Anfragen</p><p className="text-3xl font-black text-slate-900 mt-2">{tabCounts.purchased}</p></div>
        <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preislogik</p><p className="text-xs text-slate-500 mt-2">Die Freischaltpreise richten sich nach Ihrer aktuellen Tarifstufe.</p></div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100"><RefreshCw className="w-8 h-8 animate-spin mb-4 text-brand-blue" /><p className="text-slate-400 italic text-sm">Lade Marktplatz...</p></div>
        ) : filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredOrders.map((order) => {
              const price = getLeadPrice(pricingConfig, partner?.category, order.service_category);
              const isPurchasing = purchasing === order.id;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-8 flex-1">
                    <div className="flex justify-between items-start mb-6 gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.service_category === 'ENTRÜMPELUNG' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-blue-soft text-brand-blue'}`}>
                          {order.service_category === 'ENTRÜMPELUNG' ? <Package className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">{order.von_city}{order.nach_city ? ` → ${order.nach_city}` : ''}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{order.service_category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-slate-900 block">€{price.toFixed(2)}</span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Freischaltung</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3" /> Strecke</p><p className="text-sm font-bold text-slate-800 mt-1">{order.von_city || 'Unbekannt'}</p></div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><ReceiptText className="w-3 h-3" /> Kategorie</p><p className="text-sm font-bold text-slate-800 mt-1">{order.service_category}</p></div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> Anfragepreis</p><p className="text-sm font-bold text-brand-blue mt-1">€{price.toFixed(2)}</p></div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Gauge className="w-3 h-3" /> Eingang</p><span className="inline-flex mt-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">{timeAgo(order.created_at)}</span></div>
                    </div>

                    {activeTab === 'purchased' && (
                      <div className="mt-5 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Kontaktdaten freigeschaltet</p>
                        <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                        <p className="text-sm text-brand-blue font-medium">{order.customer_email}</p>
                        <p className="text-sm text-slate-600 font-medium">{order.customer_phone}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs"><Clock className="w-4 h-4" /><span className="font-medium font-mono text-[10px]">{timeAgo(order.created_at)}</span></div>
                    {activeTab === 'available' ? (
                      <button onClick={() => setConfirmOrder(order)} disabled={isPurchasing} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-brand-blue transition-all flex items-center gap-2 shadow-lg shadow-black/5 disabled:opacity-50">
                        {isPurchasing ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Lädt...</>) : (<>Details & Freischalten <ShoppingBag className="w-4 h-4" /></>)}
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 text-emerald-600 text-xs font-bold"><CheckCircle2 className="w-4 h-4" /> Freigeschaltet</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-50"><Inbox className="w-12 h-12" strokeWidth={1} /></div>
            <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">{activeTab === 'available' ? 'Aktuell keine passenden Kundenanfragen' : 'Noch keine Anfragen freigeschaltet'}</h3>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed font-medium mb-8">{activeTab === 'available' ? 'Neue Kundenanfragen erscheinen automatisch, sobald sie zu Ihrem Profil passen.' : 'Freigeschaltete Kundenanfragen erscheinen hier mit vollständigen Kontaktdaten.'}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 text-slate-300 pt-10">
        <ShieldCheck className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">100% Verifizierte Anfragen • Direkt mit Ihrem Partnerprofil abgeglichen</span>
      </div>
    </div>
  );
}
