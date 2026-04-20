'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { DEFAULT_PRICING_CONFIG, PLAN_META, PricingTier, getLeadPrice, normalizePricingConfig } from '@/lib/pricing';
import { Check, Sparkles, Crown, Zap, ShieldCheck, ArrowRight, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ICONS: Record<string, React.ElementType> = { standard: Zap, priorisiert: Sparkles, exklusiv: Crown };

export default function TariffsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);

  useEffect(() => { void fetchPartner(); }, []);

  async function fetchPartner() {
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
    } catch (error: any) {
      showToast('error', 'Fehler beim Laden', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(plan: PricingTier) {
    if (!partner || plan.alias === partner.category) return;
    setUpdatingCategory(plan.alias);
    try {
      const { error } = await supabase.from('partners').update({ category: plan.alias, updated_at: new Date().toISOString() }).eq('id', partner.id);
      if (error) throw error;
      setPartner((current: any) => ({ ...current, category: plan.alias }));
      showToast('success', 'Tarif aktualisiert', `${plan.alias} ist jetzt aktiv.`);
    } catch (error: any) {
      showToast('error', 'Fehler beim Tarifwechsel', error.message);
    } finally {
      setUpdatingCategory(null);
    }
  }

  const plans = useMemo(() => pricingConfig.umzug.map((moveTier) => {
    const clearanceTier = pricingConfig.entruempelung.find((item) => item.id === moveTier.id) || moveTier;
    return { ...moveTier, clearancePrice: clearanceTier.price, meta: PLAN_META[moveTier.alias] || PLAN_META['Standard Anfragen'], icon: ICONS[moveTier.id] };
  }), [pricingConfig]);

  const currentCategory = partner?.category || 'Standard Anfragen';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Ihre Tarife</h1>
        <p className="text-slate-400 font-medium text-sm max-w-2xl leading-relaxed">Diese Kategorien steuern direkt, welche Preise für Kundenanfragen im Marktplatz gelten.</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden">
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/10"><ShieldCheck className="w-7 h-7" /></div>
          <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Aktive Kategorie</p><h3 className="text-xl font-black text-slate-800 tracking-tight">{currentCategory}</h3></div>
        </div>
        <div className="relative z-10 text-right"><p className="text-sm font-bold text-slate-500">Aktuelle Preise</p><p className="text-sm font-black text-slate-900">Umzug €{getLeadPrice(pricingConfig, currentCategory, 'PRIVATUMZUG').toFixed(2)} / Entrümpelung €{getLeadPrice(pricingConfig, currentCategory, 'ENTRÜMPELUNG').toFixed(2)}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isActive = currentCategory === plan.alias;
          const isUpdating = updatingCategory === plan.alias;
          const Icon = plan.icon;
          return (
            <motion.div key={plan.id} whileHover={{ y: -5 }} className={`relative bg-white rounded-[3rem] p-10 border-2 transition-all duration-300 flex flex-col h-full ${isActive ? 'border-brand-blue shadow-2xl shadow-brand-blue/10 scale-[1.02] z-10' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-blue-soft text-brand-blue flex items-center justify-center shadow-lg"><Icon className="w-7 h-7" /></div>
                {isActive && <div className="flex items-center gap-1.5 text-brand-blue text-[10px] font-bold bg-brand-blue-soft px-3 py-1 rounded-full uppercase tracking-wider"><Check className="w-3 h-3" /> Aktiv</div>}
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-2">{plan.meta.title}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">{plan.meta.description}</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Umzug</p><p className="text-3xl font-black text-slate-900">€{plan.price.toFixed(2)}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entrümpelung</p><p className="text-3xl font-black text-slate-900">€{plan.clearancePrice.toFixed(2)}</p></div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {plan.meta.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm font-bold text-slate-600 leading-tight"><div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0"><Check className="w-3.5 h-3.5" /></div>{feature}</li>
                ))}
              </ul>
              <button onClick={() => handleSelectPlan(plan)} disabled={isActive || isUpdating} className={`w-full py-5 rounded-[1.5rem] font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl disabled:cursor-not-allowed ${isActive ? 'bg-slate-50 text-slate-400 border border-slate-100 shadow-none' : 'bg-gradient-to-r from-brand-blue to-brand-green text-white'}`}>
                {isUpdating ? 'Wird aktualisiert...' : isActive ? 'Aktueller Tarif' : `${plan.alias} aktivieren`} {!isActive && !isUpdating && <ArrowRight className="w-4 h-4" />}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-5"><div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><Info className="w-6 h-6" /></div><div><h4 className="font-bold text-lg leading-none mb-2">Direkt mit dem Marktplatz verknüpft</h4><p className="text-white/60 text-xs font-medium max-w-md">Änderungen an Ihrer Kategorie wirken sofort auf den Anfragepreis und die Priorisierung im Partner-Dashboard.</p></div></div>
          <button onClick={() => router.push('/partners/dashboard/anfragen')} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-brand-blue-soft transition-all flex items-center gap-2 flex-shrink-0">Zum Marktplatz <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
