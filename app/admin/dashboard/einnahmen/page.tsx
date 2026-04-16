'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PRICING_CONFIG, normalizePricingConfig } from '@/lib/pricing';
import {
  Info,
  Truck,
  Trash2,
  Save,
  Zap,
  Star,
  ShieldCheck,
} from 'lucide-react';

type EditableTier = {
  id: string;
  label: string;
  name: string;
  alias: string;
  price: string;
  icon: React.ElementType;
  iconColor: string;
};

function addPresentation(rawTiers: typeof DEFAULT_PRICING_CONFIG.umzug): EditableTier[] {
  return rawTiers.map((tier, index) => ({
    ...tier,
    label: `Kategorie ${index + 1}`,
    price: String(tier.price),
    icon: index === 0 ? Zap : index === 1 ? Star : ShieldCheck,
    iconColor: index === 0 ? 'text-brand-blue-2' : index === 1 ? 'text-amber-400' : 'text-emerald-400',
  }));
}

function stripPresentation(tiers: EditableTier[]) {
  return tiers.map(({ icon, iconColor, label, price, ...tier }) => ({
    ...tier,
    price: Number(price),
  }));
}

export default function RevenuePage() {
  const { showToast } = useToast();
  const [umzugPricing, setUmzugPricing] = useState<EditableTier[]>(() => addPresentation(DEFAULT_PRICING_CONFIG.umzug));
  const [entruempelungPricing, setEntruempelungPricing] = useState<EditableTier[]>(() => addPresentation(DEFAULT_PRICING_CONFIG.entruempelung));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  async function fetchPricing() {
    setLoading(true);

    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'pricing_config').single();
      if (error) throw error;

      const config = normalizePricingConfig(data?.value);
      setUmzugPricing(addPresentation(config.umzug));
      setEntruempelungPricing(addPresentation(config.entruempelung));
    } catch (error: any) {
      showToast('error', 'Fehler beim Laden', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(type: 'umzug' | 'entruempelung') {
    setSaving(true);

    try {
      const { data, error: settingsError } = await supabase.from('system_settings').select('value').eq('key', 'pricing_config').single();
      if (settingsError) throw settingsError;

      const currentConfig = normalizePricingConfig(data?.value);
      const nextConfig = {
        ...currentConfig,
        [type]: stripPresentation(type === 'umzug' ? umzugPricing : entruempelungPricing),
      };

      const { error } = await supabase.from('system_settings').upsert({
        key: 'pricing_config',
        value: nextConfig,
      });

      if (error) throw error;

      showToast('success', 'Preise gespeichert', `${type === 'umzug' ? 'Umzug' : 'Entrümpelung'} wurde erfolgreich aktualisiert.`);
    } catch (error: any) {
      showToast('error', 'Fehler beim Speichern', error.message);
    } finally {
      setSaving(false);
    }
  }

  function updatePricingField(type: 'umzug' | 'entruempelung', id: string, field: 'name' | 'price', value: string) {
    const setter = type === 'umzug' ? setUmzugPricing : setEntruempelungPricing;
    setter((currentTiers) => currentTiers.map((tier) => tier.id === id ? { ...tier, [field]: value } : tier));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Service-Kategorien (Name + Preis)</h2>
          <p className="text-sm text-slate-500 mt-1">Diese Werte steuern direkt die Preise im Partner-Marktplatz.</p>
        </div>
      </div>

      <div className="bg-brand-blue-soft border border-brand-blue/20 rounded-2xl p-4 flex items-center gap-4 text-slate-800">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-blue flex-shrink-0 shadow-sm">
          <Info className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium">
          Änderungen wirken sich sofort auf `partners/dashboard/anfragen`, `partners/dashboard/tarife` und `partners/dashboard/finanzen` aus.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center shadow-lg shadow-brand-blue/20">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Umzug</h3>
          </div>

          <div className="p-8 space-y-8">
            {umzugPricing.map((tier) => (
              <div key={tier.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <tier.icon className={`w-4 h-4 ${tier.iconColor}`} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{tier.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(event) => updatePricingField('umzug', tier.id, 'name', event.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-sans"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(event) => updatePricingField('umzug', tier.id, 'price', event.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-sans"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => handleSave('umzug')}
              disabled={saving}
              className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10 mt-4 group disabled:opacity-50"
            >
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {saving ? 'Speichern...' : 'Umzug speichern'}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00b67a] text-white flex items-center justify-center shadow-lg shadow-green-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Entrümpelung</h3>
          </div>

          <div className="p-8 space-y-8">
            {entruempelungPricing.map((tier) => (
              <div key={tier.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <tier.icon className={`w-4 h-4 ${tier.iconColor}`} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{tier.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(event) => updatePricingField('entruempelung', tier.id, 'name', event.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-sans"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(event) => updatePricingField('entruempelung', tier.id, 'price', event.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-sans"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => handleSave('entruempelung')}
              disabled={saving}
              className="w-full bg-[#00b67a] text-white py-4 rounded-2xl font-bold hover:bg-[#008f5e] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 mt-4 group disabled:opacity-50"
            >
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {saving ? 'Speichern...' : 'Entrümpelung speichern'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
