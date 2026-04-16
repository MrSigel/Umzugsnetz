'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { DEFAULT_PRICING_CONFIG, PLAN_META, PricingTier, getLeadPrice, normalizePricingConfig } from '@/lib/pricing';
import {
  Check,
  Sparkles,
  Crown,
  Zap,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const ICONS: Record<string, React.ElementType> = {
  standard: Zap,
  priorisiert: Sparkles,
  exklusiv: Crown,
};

const COLORS: Record<string, string> = {
  standard: 'blue',
  priorisiert: 'emerald',
  exklusiv: 'amber',
};

export default function TariffsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchPartner();
  }, []);

  async function fetchPartner() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Nicht angemeldet.');
      }

      const [{ data: partnerData, error: partnerError }, { data: pricingData }] = await Promise.all([
        supabase.from('partners').select('*').eq('user_id', user.id).single(),
        supabase.from('system_settings').select('value').eq('key', 'pricing_config').single(),
      ]);

      if (partnerError) {
        throw partnerError;
      }

      setPartner(partnerData);
      setPricingConfig(normalizePricingConfig(pricingData?.value));
    } catch (error: any) {
      showToast('error', 'Fehler beim Laden', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(plan: PricingTier) {
    if (!partner || plan.alias === partner.category) {
      return;
    }

    setUpdatingCategory(plan.alias);

    try {
      const { error } = await supabase
        .from('partners')
        .update({ category: plan.alias, updated_at: new Date().toISOString() })
        .eq('id', partner.id);

      if (error) {
        throw error;
      }

      setPartner((currentPartner: any) => ({ ...currentPartner, category: plan.alias }));
      showToast('success', 'Tarif aktualisiert', `${plan.alias} ist jetzt aktiv.`);
    } catch (error: any) {
      showToast('error', 'Fehler beim Tarifwechsel', error.message);
    } finally {
      setUpdatingCategory(null);
    }
  }

  const plans = useMemo(() => pricingConfig.umzug.map((moveTier) => {
    const clearanceTier = pricingConfig.entruempelung.find((item) => item.id === moveTier.id) || moveTier;
    return {
      ...moveTier,
      clearancePrice: clearanceTier.price,
      meta: PLAN_META[moveTier.alias] || PLAN_META['Standard Anfragen'],
      color: COLORS[moveTier.id],
      icon: ICONS[moveTier.id],
    };
  }), [pricingConfig]);

  const currentCategory = partner?.category || 'Standard Anfragen';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#0075c9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Ihre Tarife</h1>
        <p className="text-slate-400 font-medium text-sm max-w-2xl leading-relaxed">
          Diese Kategorien steuern direkt, welche Preise für Lead-Käufe im Marktplatz gelten.
        </p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors duration-500" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Aktive Kategorie</p>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{currentCategory}</h3>
          </div>
        </div>
        <div className="relative z-10 text-right">
          <p className="text-sm font-bold text-slate-500">Aktuelle Preise</p>
          <p className="text-sm font-black text-slate-900">
            Umzug €{getLeadPrice(pricingConfig, currentCategory, 'PRIVATUMZUG').toFixed(2)} / Entrümpelung €{getLeadPrice(pricingConfig, currentCategory, 'ENTRÜMPELUNG').toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isActive = currentCategory === plan.alias;
          const isUpdating = updatingCategory === plan.alias;
          const Icon = plan.icon;

          return (
            <motion.div
              key={plan.id}
              whileHover={{ y: -5 }}
              className={`relative bg-white rounded-[3rem] p-10 border-2 transition-all duration-300 flex flex-col h-full ${
                isActive ? 'border-[#0075c9] shadow-2xl shadow-blue-500/10 scale-[1.02] z-10' : 'border-slate-100 shadow-sm hover:border-slate-200'
              }`}
            >
              {plan.id === 'priorisiert' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#0075c9] to-[#00b67a] text-white text-[10px] font-black px-6 py-2 rounded-full shadow-xl uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Empfohlen
                </div>
              )}

              <div className="flex items-center justify-between mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  plan.color === 'blue' ? 'bg-blue-50 text-[#0075c9] shadow-blue-500/5' :
                  plan.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-500/5' :
                  'bg-amber-50 text-amber-600 shadow-amber-500/5'
                }`}>
                  <Icon className="w-7 h-7" />
                </div>
                {isActive && (
                  <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-bold bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    <Check className="w-3 h-3" /> Aktiv
                  </div>
                )}
              </div>

              <h3 className="text-3xl font-black text-slate-800 mb-2">{plan.meta.title}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">{plan.meta.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Umzug</p>
                  <p className="text-3xl font-black text-slate-900">€{plan.price.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entrümpelung</p>
                  <p className="text-3xl font-black text-slate-900">€{plan.clearancePrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="h-px bg-slate-100 w-full mb-8" />

              <ul className="space-y-4 mb-10 flex-1">
                {plan.meta.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm font-bold text-slate-600 leading-tight">
                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 ring-2 ring-white flex-shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isActive || isUpdating}
                className={`w-full py-5 rounded-[1.5rem] font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl disabled:cursor-not-allowed ${
                  isActive
                    ? 'bg-slate-50 text-slate-400 border border-slate-100 shadow-none'
                    : isUpdating
                      ? 'bg-slate-100 text-slate-400 shadow-none'
                      : plan.id === 'priorisiert'
                        ? 'bg-gradient-to-r from-[#0075c9] to-[#00b67a] text-white hover:shadow-blue-500/20 hover:scale-[1.02]'
                        : plan.id === 'exklusiv'
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:shadow-amber-500/20 hover:scale-[1.02]'
                          : 'bg-white text-[#0075c9] border-2 border-[#0075c9] hover:bg-blue-50 hover:scale-[1.02]'
                }`}
              >
                {isUpdating ? 'Wird aktualisiert...' : isActive ? 'Aktueller Tarif' : `${plan.alias} aktivieren`}
                {!isActive && !isUpdating && <ArrowRight className="w-4 h-4" />}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white ring-1 ring-white/20">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg leading-none mb-2">Direkt mit dem Marktplatz verknüpft</h4>
              <p className="text-white/60 text-xs font-medium max-w-md">
                Änderungen an Ihrer Kategorie wirken sofort auf den Lead-Preis und die Priorisierung im Partner-Dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/partners/dashboard/anfragen')}
            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all flex items-center gap-2 flex-shrink-0"
          >
            Zum Marktplatz <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
