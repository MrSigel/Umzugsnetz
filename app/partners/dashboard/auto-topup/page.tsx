'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  RefreshCw, 
  Settings2, 
  Zap, 
  Clock, 
  BatteryLow, 
  ShieldCheck, 
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type LogicMode = 'threshold' | 'empty' | 'time';

export default function AutoTopupPage() {
  const { showToast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [logicMode, setLogicMode] = useState<LogicMode>('threshold');
  const [topupAmount, setTopupAmount] = useState('50');
  const [thresholdValue, setThresholdValue] = useState('10');
  const [topupInterval, setTopupInterval] = useState('30');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;

      if (data && data.settings?.autoTopup) {
        setPartner(data);
        const s = data.settings.autoTopup;
        setIsEnabled(s.isEnabled || false);
        setLogicMode(s.logicMode || 'threshold');
        setTopupAmount(String(s.topupAmount || '50'));
        setThresholdValue(String(s.thresholdValue || '10'));
        setTopupInterval(String(s.topupInterval || '30'));
      } else if (data) {
        setPartner(data);
      }
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden', err.message || 'Unbekannter Fehler');
    }
  }

  const handleSave = async () => {
    if (!partner) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          settings: {
            ...partner.settings,
            autoTopup: {
              isEnabled,
              logicMode,
              topupAmount: Number(topupAmount),
              thresholdValue: Number(thresholdValue),
              topupInterval: Number(topupInterval)
            }
          }
        })
        .eq('user_id', partner.user_id);

      if (error) throw error;
      setPartner((prev: any) => ({
        ...prev,
        settings: {
          ...(prev?.settings || {}),
          autoTopup: {
            isEnabled,
            logicMode,
            topupAmount: Number(topupAmount),
            thresholdValue: Number(thresholdValue),
            topupInterval: Number(topupInterval)
          }
        }
      }));
      
      setSaved(true);
      showToast('success', 'Auto Top-up gespeichert', 'Ihre Einstellungen wurden erfolgreich aktualisiert.');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      showToast('error', 'Fehler beim Speichern', err.message || 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Auto Top-up</h1>
        <p className="text-slate-400 font-medium text-sm max-w-xl leading-relaxed">
          Speichern Sie Ihre gewünschte Auflade-Regel zentral in Ihrem Partnerprofil. Die Konfiguration steht damit konsistent für künftige Billing-Automation bereit.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Master Toggle Section */}
        <div className={`p-8 md:p-10 border-b border-slate-50 transition-colors ${isEnabled ? 'bg-emerald-50/30' : 'bg-slate-50/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isEnabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-400'}`}>
                <RefreshCw className={`w-7 h-7 ${isEnabled ? 'animate-spin-slow' : ''}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Auto Top-up aktivieren</h3>
                <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                   System ist aktuell {isEnabled ? 'AKTIVIERT' : 'DEAKTIVIERT'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative w-16 h-8 rounded-full transition-all duration-300 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
               <motion.div 
                 animate={{ x: isEnabled ? 34 : 4 }}
                 className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
               />
            </button>
          </div>
        </div>

        {/* Configuration Body */}
        <div className={`p-8 md:p-10 space-y-10 transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale-[0.5]'}`}>
           {/* Step 1: Select Logic */}
           <div className="space-y-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Auflade-Logik wählen</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {[
                   { id: 'threshold', label: 'Schwellenwert', icon: BatteryLow, desc: 'Aufladen, sobald Guthaben unter einen Wert fällt.' },
                   { id: 'empty', label: 'Sobald Leer', icon: Zap, desc: 'Sofort aufladen, wenn das Guthaben 0,00 € erreicht.' },
                   { id: 'time', label: 'Zeitbasiert', icon: Clock, desc: 'In festen Abständen aufladen (z.B. alle 30 Tage).' }
                 ].map((mode) => (
                   <button
                    key={mode.id}
                    onClick={() => setLogicMode(mode.id as LogicMode)}
                    className={`p-6 rounded-3xl border-2 text-left transition-all group ${
                      logicMode === mode.id 
                        ? 'border-[#0075c9] bg-blue-50/30' 
                        : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'
                    }`}
                   >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all ${
                       logicMode === mode.id ? 'bg-[#0075c9] text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'
                     }`}>
                        <mode.icon className="w-5 h-5" />
                     </div>
                     <h4 className={`font-bold text-sm mb-1 ${logicMode === mode.id ? 'text-slate-900' : 'text-slate-500'}`}>{mode.label}</h4>
                     <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{mode.desc}</p>
                   </button>
                 ))}
              </div>
           </div>

           {/* Step 2: Settings */}
           <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Auflade-Betrag (Min. €10)</label>
                 <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">€</span>
                    <input 
                      type="number" 
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="w-full bg-white border border-slate-100 rounded-2xl pl-10 pr-6 py-4 text-lg font-black text-slate-800 focus:outline-none focus:border-[#0075c9] transition-all"
                    />
                 </div>
              </div>

              {logicMode === 'threshold' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Schwellenwert (Triggert bei weniger als)</label>
                  <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">€</span>
                      <input 
                        type="number" 
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-2xl pl-10 pr-6 py-4 text-lg font-black text-slate-800 focus:outline-none focus:border-[#0075c9] transition-all"
                      />
                  </div>
                </motion.div>
              )}

              {logicMode === 'time' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Intervall (Alle X Tage aufladen)</label>
                  <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">
                        <Clock className="w-4 h-4" />
                      </span>
                      <input 
                        type="number" 
                        value={topupInterval}
                        onChange={(e) => setTopupInterval(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-lg font-black text-slate-800 focus:outline-none focus:border-[#0075c9] transition-all"
                      />
                  </div>
                </motion.div>
              )}
           </div>

           {/* Save Button */}
           <div className="flex justify-end pt-4 font-sans">
              <button 
                onClick={handleSave}
                disabled={saving}
                className={`px-10 py-5 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-xl ${
                  saved 
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                    : 'bg-[#0075c9] text-white hover:bg-[#005ea6] shadow-blue-500/20 active:scale-95'
                }`}
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'Wird gespeichert...' : saved ? 'Einstellungen gespeichert' : 'Einstellungen speichern'}
              </button>
           </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-8 flex gap-6 items-start">
         <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
         </div>
         <div className="space-y-2">
            <h4 className="font-black text-slate-800 text-sm">Sicherheit & Zahlungen</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium italic">
              Diese Seite speichert die Regel in Supabase. Eine automatische Ausführung erfolgt erst, sobald ein Zahlungs-Backend angebunden ist.
            </p>
         </div>
      </div>
    </div>
  );
}
