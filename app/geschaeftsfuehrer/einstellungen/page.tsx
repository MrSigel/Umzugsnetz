/**
 * Geschäftsführer-Einstellungen
 * Echte Daten aus Supabase system_settings, helles Design
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [minTopup, setMinTopup] = useState('10');
  const [billingSettings, setBillingSettings] = useState({
    beneficiary: '',
    iban: '',
    bic: '',
    note: '',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from('system_settings')
          .select('key, value');

        if (settings) {
          for (const s of settings) {
            switch (s.key) {
              case 'maintenance_mode':
                setMaintenanceMode(s.value === 'true' || s.value === true);
                break;
              case 'min_topup_amount':
                setMinTopup(String(s.value));
                break;
              case 'billing_settings':
                if (typeof s.value === 'object') {
                  setBillingSettings({
                    beneficiary: s.value.beneficiary || '',
                    iban: s.value.iban || '',
                    bic: s.value.bic || '',
                    note: s.value.note || '',
                  });
                }
                break;
            }
          }
        }
      } catch (e) {
        console.error('Settings load error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Maintenance Mode speichern
      await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(maintenanceMode), updated_at: new Date().toISOString() })
        .eq('key', 'maintenance_mode');

      // Min Topup speichern
      await supabase
        .from('system_settings')
        .update({ value: Number(minTopup), updated_at: new Date().toISOString() })
        .eq('key', 'min_topup_amount');

      // Billing Settings speichern
      await supabase
        .from('system_settings')
        .update({ value: billingSettings, updated_at: new Date().toISOString() })
        .eq('key', 'billing_settings');

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-3 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-black text-slate-800">Einstellungen</h1>
        <p className="text-slate-500 text-sm mt-1">Systemeinstellungen und Rechnungsdaten verwalten</p>
      </motion.div>

      {/* Rechnungsdaten */}
      <motion.section variants={itemVariants} className="bg-white rounded-2xl border border-brand-blue/8 p-6 shadow-[0_2px_12px_rgba(2,118,200,0.06)]">
        <h2 className="text-base font-black text-slate-800 mb-5">Rechnungsdaten</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Empfänger</label>
            <input
              type="text"
              value={billingSettings.beneficiary}
              onChange={(e) => setBillingSettings({ ...billingSettings, beneficiary: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">IBAN</label>
            <input
              type="text"
              value={billingSettings.iban}
              onChange={(e) => setBillingSettings({ ...billingSettings, iban: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">BIC</label>
            <input
              type="text"
              value={billingSettings.bic}
              onChange={(e) => setBillingSettings({ ...billingSettings, bic: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Hinweistext</label>
            <textarea
              value={billingSettings.note}
              onChange={(e) => setBillingSettings({ ...billingSettings, note: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 resize-none"
            />
          </div>
        </div>
      </motion.section>

      {/* System */}
      <motion.section variants={itemVariants} className="bg-white rounded-2xl border border-brand-blue/8 p-6 shadow-[0_2px_12px_rgba(2,118,200,0.06)]">
        <h2 className="text-base font-black text-slate-800 mb-5">System</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Min. Auflade-Betrag (€)</label>
            <input
              type="number"
              value={minTopup}
              onChange={(e) => setMinTopup(e.target.value)}
              min="1"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
          <label className="flex items-center justify-between p-4 rounded-xl border border-brand-blue/8 bg-[#f8fbff] cursor-pointer">
            <div>
              <p className="text-sm font-bold text-slate-800">Wartungsmodus</p>
              <p className="text-xs text-slate-400 mt-0.5">Deaktiviert den öffentlichen Zugriff auf die Plattform</p>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              type="button"
              className={`relative ml-4 inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${
                maintenanceMode ? 'bg-brand-blue' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                maintenanceMode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </label>
        </div>
      </motion.section>

      {/* Save */}
      <motion.div variants={itemVariants} className="flex items-center justify-end gap-3">
        {saved && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-brand-green text-sm font-semibold">
            <CheckCircle className="w-4 h-4" />
            Gespeichert
          </motion.div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold transition shadow-md shadow-brand-blue/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </button>
      </motion.div>
    </motion.div>
  );
}
