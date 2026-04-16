'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Settings, X, Check } from 'lucide-react';
import Link from 'next/link';

type CookieSettings = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
};

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<CookieSettings>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const newSettings = { essential: true, analytics: true, marketing: true };
    saveSettings(newSettings);
  };

  const handleDeclineAll = () => {
    const newSettings = { essential: true, analytics: false, marketing: false };
    saveSettings(newSettings);
  };

  const handleSaveSettings = () => {
    saveSettings(settings);
  };

  const saveSettings = (s: CookieSettings) => {
    localStorage.setItem('cookie-consent', JSON.stringify(s));
    setIsVisible(false);
    // Hier könnten Tracker initialisiert werden
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 md:p-8 pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 p-6 md:p-8 pointer-events-auto overflow-hidden relative"
          >
            {/* Header / Info */}
            {!showSettings ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue flex-shrink-0">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black text-slate-800 mb-2">Ihre Privatsphäre ist uns wichtig</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Wir nutzen Cookies, um unsere Website für Sie optimal zu gestalten und fortlaufend zu verbessern. 
                    Weitere Informationen finden Sie in unserer <Link href="/datenschutz" className="text-brand-blue font-bold hover:underline">Datenschutzerklärung</Link>.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="px-6 py-3 rounded-xl border-2 border-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Einstellungen
                  </button>
                  <button 
                    onClick={handleDeclineAll}
                    className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
                  >
                    Ablehnen
                  </button>
                  <button 
                    onClick={handleAcceptAll}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-green text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                  >
                    Alle akzeptieren
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-slate-800">Cookie-Einstellungen</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {/* Essential */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">Notwendige Cookies</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Immer aktiv</div>
                    </div>
                    <div className="w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue">
                      <Check className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Analytics */}
                  <label className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-100 cursor-pointer hover:border-brand-blue/20 transition-all">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">Analyse & Statistik</div>
                      <div className="text-xs text-slate-400">Helfen uns zu verstehen, wie Besucher mit der Website interagieren.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.analytics} 
                      onChange={(e) => setSettings({...settings, analytics: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-2 border-slate-200 text-brand-blue focus:ring-brand-blue"
                    />
                  </label>

                  {/* Marketing */}
                  <label className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-100 cursor-pointer hover:border-brand-blue/20 transition-all">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">Marketing & Werbung</div>
                      <div className="text-xs text-slate-400">Ermöglichen personalisierte Werbeangebote auf Drittseiten.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.marketing} 
                      onChange={(e) => setSettings({...settings, marketing: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-2 border-slate-200 text-brand-blue focus:ring-brand-blue"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="px-6 py-3 rounded-xl text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
                  >
                    Zurück
                  </button>
                  <button 
                    onClick={handleSaveSettings}
                    className="px-8 py-3 rounded-xl bg-brand-blue text-white font-bold text-sm shadow-md hover:bg-brand-blue-hover transition-all"
                  >
                    Auswahl speichern
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
