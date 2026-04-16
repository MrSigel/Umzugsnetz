'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Settings, Wallet } from 'lucide-react';
import { DEFAULT_BILLING_SETTINGS, normalizeBillingSettings, normalizeBooleanSetting, normalizeNumberSetting } from '@/lib/settings';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [minTopup, setMinTopup] = useState('50');
  const [billingSettings, setBillingSettings] = useState(DEFAULT_BILLING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);

    try {
      const [
        { data: maintenanceData, error: maintenanceError },
        { data: minTopupData, error: minTopupError },
        { data: billingData, error: billingError },
      ] = await Promise.all([
        supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').single(),
        supabase.from('system_settings').select('value').eq('key', 'min_topup_amount').single(),
        supabase.from('system_settings').select('value').eq('key', 'billing_settings').single(),
      ]);

      if (maintenanceError) throw maintenanceError;
      if (minTopupError) throw minTopupError;
      if (billingError) throw billingError;

      setMaintenanceMode(normalizeBooleanSetting(maintenanceData?.value, false));
      setMinTopup(String(normalizeNumberSetting(minTopupData?.value, 50)));
      setBillingSettings(normalizeBillingSettings(billingData?.value));
    } catch (error: any) {
      showToast('error', 'Fehler beim Laden', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSetting(key: string, value: unknown, successMessage: string) {
    setSaving(true);

    try {
      const { error } = await supabase.from('system_settings').upsert({ key, value });
      if (error) throw error;

      showToast('success', 'Einstellung gespeichert', successMessage);
    } catch (error: any) {
      showToast('error', 'Fehler beim Speichern', error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#0075c9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 font-sans">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Settings className="w-7 h-7 text-[#0075c9]" />
          Globale Einstellungen
        </h2>
        <p className="text-sm text-slate-500 mt-1">Verwalten Sie plattformweite Parameter und Abrechnungsdaten.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 space-y-8">
          <section className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-bold text-slate-800">Wartungsmodus</h4>
                <button
                  onClick={() => {
                    const nextValue = !maintenanceMode;
                    setMaintenanceMode(nextValue);
                    handleUpdateSetting('maintenance_mode', nextValue, `Wartungsmodus ist jetzt ${nextValue ? 'aktiv' : 'inaktiv'}.`);
                  }}
                  className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${maintenanceMode ? 'bg-[#ff3b30]' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${maintenanceMode ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-bold uppercase tracking-widest ${maintenanceMode ? 'text-[#ff3b30]' : 'text-slate-400'}`}>
                  {maintenanceMode ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Bei aktivem Wartungsmodus bleiben Admin-Bereiche erreichbar, öffentliche Formulare und Partner-Zugänge können gezielt deaktiviert werden.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Zahlungseinstellungen</h3>
                <p className="text-sm text-slate-400">Mindestbetrag und Bankdaten für Partner</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Mindest-Aufladebetrag (€)</label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      value={minTopup}
                      onChange={(event) => setMinTopup(event.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 transition-colors font-bold text-slate-700"
                    />
                    <button
                      onClick={() => handleUpdateSetting('min_topup_amount', Number(minTopup), `Mindest-Aufladebetrag wurde auf €${Number(minTopup).toFixed(2)} gesetzt.`)}
                      disabled={saving}
                      className="px-6 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Bankdaten für Partner</label>
                <input
                  type="text"
                  value={billingSettings.beneficiary}
                  onChange={(event) => setBillingSettings((currentSettings) => ({ ...currentSettings, beneficiary: event.target.value }))}
                  placeholder="Empfänger"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0075c9]/10"
                />
                <input
                  type="text"
                  value={billingSettings.iban}
                  onChange={(event) => setBillingSettings((currentSettings) => ({ ...currentSettings, iban: event.target.value }))}
                  placeholder="IBAN"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0075c9]/10"
                />
                <input
                  type="text"
                  value={billingSettings.bic}
                  onChange={(event) => setBillingSettings((currentSettings) => ({ ...currentSettings, bic: event.target.value }))}
                  placeholder="BIC"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0075c9]/10"
                />
                <textarea
                  rows={3}
                  value={billingSettings.note}
                  onChange={(event) => setBillingSettings((currentSettings) => ({ ...currentSettings, note: event.target.value }))}
                  placeholder="Hinweis für Partner"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0075c9]/10 resize-none"
                />
                <button
                  onClick={() => handleUpdateSetting('billing_settings', billingSettings, 'Bankdaten für Partner wurden gespeichert.')}
                  disabled={saving}
                  className="px-6 py-3 bg-[#0075c9] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#005ea6] transition-colors disabled:opacity-50"
                >
                  Bankdaten speichern
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
