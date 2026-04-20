'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Info, X, Calculator, Truck, Building2, Trash2,
  MapPin, Flag, CalendarDays, ShieldCheck, CheckCircle2, Star,
  ArrowRight, Users, BadgeCheck, Plus, Minus, AlertTriangle,
  ParkingSquareOff, Phone, Mail, User, Clock, MessageSquare,
  Layers, PersonStanding, PackageCheck, Dumbbell
} from 'lucide-react';

// ─────────────────────────────────────────────
// INFO MODAL
// ─────────────────────────────────────────────
function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto modal-scrollbar rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-8 md:p-10">
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue"><Calculator className="w-8 h-8" /></div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Berechnungsgrundlage</h3>
        </div>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>Der Schätzpreis basiert auf Wohnfläche und Entfernung als erste Orientierung. Im nächsten Schritt verfeinern wir die Kalkulation anhand Ihrer Angaben.</p>
          <ul className="pl-4 list-disc space-y-1 marker:text-brand-blue">
            <li>Wohnfläche der Wohnung (m²)</li>
            <li>Entfernung zwischen Auszugs- und Einzugsort (km)</li>
            <li>Etagen und Transportwege</li>
            <li>Aufzug, Halteverbot & Sonderleistungen</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const SERVICES = [
  { id: 'privatumzug', label: 'Privatumzug', icon: Truck },
  { id: 'firmenumzug', label: 'Firmenumzug', icon: Building2 },
  { id: 'entruempelung', label: 'Entrümpelung', icon: Trash2 },
];

const ENTRUEMPEL_ITEMS = [
  { id: 'sofa', label: 'Sofa', pricePerUnit: 40 },
  { id: 'tisch', label: 'Tisch', pricePerUnit: 20 },
  { id: 'stuehle', label: 'Stühle', pricePerUnit: 10 },
  { id: 'schraenke', label: 'Schränke', pricePerUnit: 35 },
  { id: 'matratze', label: 'Matratze', pricePerUnit: 25 },
  { id: 'kartons', label: 'Umzugskartons', pricePerUnit: 5 },
  { id: 'elektro', label: 'Elektrogeräte', pricePerUnit: 30 },
  { id: 'kleinkram', label: 'Sonstiger Kleinkram', pricePerUnit: 15 },
];

const ETAGEN = ['EG', '1. OG', '2. OG', '3. OG', '4. OG+'];

type Step = 'rechner' | 'details' | 'kontakt' | 'success';

const CALCULATOR_STORAGE_KEY = 'umzugsnetz_rechner_state_v1';

function ProgressBar({ step }: { step: Step }) {
  const steps: Step[] = ['rechner', 'details', 'kontakt', 'success'];
  const idx = steps.indexOf(step);
  const labels = ['Schätzung', 'Details', 'Kontakt', 'Fertig'];
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1 mb-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= idx ? 'bg-brand-blue' : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {labels.map((l, i) => (
          <span key={l} className={i <= idx ? 'text-brand-blue' : ''}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function ToggleOption({ label, desc, active, onClick, icon: Icon }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left w-full transition-all ${active ? 'border-brand-blue bg-brand-blue-soft' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 transition-colors ${active ? 'text-brand-blue' : 'text-slate-300'}`} />
      <div>
        <div className={`font-bold text-sm transition-colors ${active ? 'text-brand-blue' : 'text-slate-700'}`}>{label}</div>
        {desc && <div className="text-xs text-slate-400 mt-0.5">{desc}</div>}
      </div>
    </button>
  );
}

function ItemCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border-2 border-slate-100 hover:border-brand-blue/30 transition-colors">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-500 flex items-center justify-center transition-all">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-5 text-center font-black text-slate-800 text-sm">{value}</span>
        <button onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-500 flex items-center justify-center transition-all">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors font-bold text-black appearance-none cursor-pointer text-sm">
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function InputField({ label, icon: Icon, ...props }: any) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />}
        <input {...props} className={`w-full bg-white border-2 border-slate-200 rounded-2xl ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm`} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN WIDGET
// ─────────────────────────────────────────────
export default function KostenrechnerWidget() {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('rechner');
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STEP 1
  const [wohnflaeche, setWohnflaeche] = useState(60);
  const [entfernung, setEntfernung] = useState(50);
  const [selectedService, setSelectedService] = useState('privatumzug');

  // STEP 2 – Umzug
  const [von, setVon] = useState('');
  const [nach, setNach] = useState('');
  const [datum, setDatum] = useState('');
  const [etageAuszug, setEtageAuszug] = useState('EG');
  const [etageEinzug, setEtageEinzug] = useState('EG');
  const [aufzugAuszug, setAufzugAuszug] = useState<'ja'|'nein'>('nein');
  const [aufzugEinzug, setAufzugEinzug] = useState<'ja'|'nein'>('nein');
  const [trageweg, setTrageweg] = useState(false);
  const [halteverbot, setHalteverbot] = useState(false);
  const [sperrgut, setSperrgut] = useState(false);
  const [verpackung, setVerpackung] = useState(false);
  const [umzugNotizen, setUmzugNotizen] = useState('');

  // STEP 2 – Entrümpelung
  const [itemCounts, setItemCounts] = useState<Record<string, number>>(
    Object.fromEntries(ENTRUEMPEL_ITEMS.map(i => [i.id, 0]))
  );
  const [etage, setEtage] = useState('EG');
  const [aufzug, setAufzug] = useState<'ja'|'nein'>('nein');
  const [erschwerterZugang, setErschwerterZugang] = useState(false);
  const [parkverbot, setParkverbot] = useState(false);
  const [entruempelNotizen, setEntruempelNotizen] = useState('');

  // STEP 3 – Kontakt
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [erreichbarAb, setErreichbarAb] = useState('');
  const [kontaktNotizen, setKontaktNotizen] = useState('');

  const isEntruempelung = selectedService === 'entruempelung';

  const wohnflaecheCost = wohnflaeche * 4.412;
  const entfernungCost = entfernung * 2.52962;
  const umzugExtras = [
    { label: 'Langer Trageweg', active: trageweg, amount: 80 },
    { label: 'Halteverbotszone', active: halteverbot, amount: 60 },
    { label: 'Schwere Sondergüter', active: sperrgut, amount: 120 },
    { label: 'Verpackungsservice', active: verpackung, amount: 200 },
  ].filter((item) => item.active);
  const umzugExtrasCost = umzugExtras.reduce((sum, item) => sum + item.amount, 0);
  const entruempelItemsBreakdown = ENTRUEMPEL_ITEMS
    .map((item) => ({
      label: item.label,
      count: itemCounts[item.id],
      amount: itemCounts[item.id] * item.pricePerUnit,
    }))
    .filter((item) => item.count > 0);
  const entruempelEtageCost = ETAGEN.indexOf(etage) > 0 && aufzug === 'nein' ? ETAGEN.indexOf(etage) * 30 : 0;
  const entruempelExtras = [
    { label: 'Erschwerter Zugang', active: erschwerterZugang, amount: 50 },
    { label: 'Parkverbot', active: parkverbot, amount: 30 },
  ].filter((item) => item.active);

  const priceBreakdown = isEntruempelung
    ? [
        ...entruempelItemsBreakdown.map((item) => ({
          label: `${item.label}${item.count > 1 ? ` x${item.count}` : ''}`,
          amount: item.amount,
        })),
        ...(entruempelEtageCost > 0 ? [{ label: 'Etagenzuschlag', amount: entruempelEtageCost }] : []),
        ...entruempelExtras.map((item) => ({ label: item.label, amount: item.amount })),
      ]
    : [
        { label: 'Wohnfläche', amount: wohnflaecheCost, suffix: `${wohnflaeche} m²` },
        { label: 'Entfernung', amount: entfernungCost, suffix: `${entfernung} km` },
        ...umzugExtras.map((item) => ({ label: item.label, amount: item.amount })),
      ];

  // Lausche auf Custom Events und URL-Parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get('service');
    if (serviceParam) {
      setSelectedService(serviceParam);
      setStep('details');
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.service) {
        setSelectedService(detail.service);
        setStep('details');
      }
    };
    window.addEventListener('openRechner', handler);
    return () => window.removeEventListener('openRechner', handler);
  }, []);

  useEffect(() => {
    try {
      const rawValue = localStorage.getItem(CALCULATOR_STORAGE_KEY);
      if (!rawValue) {
        return;
      }

      const saved = JSON.parse(rawValue);

      if (saved.selectedService) setSelectedService(saved.selectedService);
      if (typeof saved.wohnflaeche === 'number') setWohnflaeche(saved.wohnflaeche);
      if (typeof saved.entfernung === 'number') setEntfernung(saved.entfernung);
      if (saved.von) setVon(saved.von);
      if (saved.nach) setNach(saved.nach);
      if (saved.datum) setDatum(saved.datum);
      if (saved.etageAuszug) setEtageAuszug(saved.etageAuszug);
      if (saved.etageEinzug) setEtageEinzug(saved.etageEinzug);
      if (saved.aufzugAuszug) setAufzugAuszug(saved.aufzugAuszug);
      if (saved.aufzugEinzug) setAufzugEinzug(saved.aufzugEinzug);
      if (typeof saved.trageweg === 'boolean') setTrageweg(saved.trageweg);
      if (typeof saved.halteverbot === 'boolean') setHalteverbot(saved.halteverbot);
      if (typeof saved.sperrgut === 'boolean') setSperrgut(saved.sperrgut);
      if (typeof saved.verpackung === 'boolean') setVerpackung(saved.verpackung);
      if (saved.umzugNotizen) setUmzugNotizen(saved.umzugNotizen);
      if (saved.itemCounts) setItemCounts(saved.itemCounts);
      if (saved.etage) setEtage(saved.etage);
      if (saved.aufzug) setAufzug(saved.aufzug);
      if (typeof saved.erschwerterZugang === 'boolean') setErschwerterZugang(saved.erschwerterZugang);
      if (typeof saved.parkverbot === 'boolean') setParkverbot(saved.parkverbot);
      if (saved.entruempelNotizen) setEntruempelNotizen(saved.entruempelNotizen);
      if (saved.vorname) setVorname(saved.vorname);
      if (saved.nachname) setNachname(saved.nachname);
      if (saved.email) setEmail(saved.email);
      if (saved.telefon) setTelefon(saved.telefon);
      if (saved.erreichbarAb) setErreichbarAb(saved.erreichbarAb);
      if (saved.kontaktNotizen) setKontaktNotizen(saved.kontaktNotizen);
    } catch {
      localStorage.removeItem(CALCULATOR_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const payload = {
      selectedService,
      wohnflaeche,
      entfernung,
      von,
      nach,
      datum,
      etageAuszug,
      etageEinzug,
      aufzugAuszug,
      aufzugEinzug,
      trageweg,
      halteverbot,
      sperrgut,
      verpackung,
      umzugNotizen,
      itemCounts,
      etage,
      aufzug,
      erschwerterZugang,
      parkverbot,
      entruempelNotizen,
      vorname,
      nachname,
      email,
      telefon,
      erreichbarAb,
      kontaktNotizen,
    };

    localStorage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(payload));
  }, [
    selectedService,
    wohnflaeche,
    entfernung,
    von,
    nach,
    datum,
    etageAuszug,
    etageEinzug,
    aufzugAuszug,
    aufzugEinzug,
    trageweg,
    halteverbot,
    sperrgut,
    verpackung,
    umzugNotizen,
    itemCounts,
    etage,
    aufzug,
    erschwerterZugang,
    parkverbot,
    entruempelNotizen,
    vorname,
    nachname,
    email,
    telefon,
    erreichbarAb,
    kontaktNotizen,
  ]);

  const estimatedPrice = wohnflaeche === 0 && entfernung === 0
    ? '0,00'
    : ((wohnflaeche * 4.412) + (entfernung * 2.52962)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const entruempelPrice = (() => {
    const base = ENTRUEMPEL_ITEMS.reduce((sum, item) => sum + (itemCounts[item.id] * item.pricePerUnit), 0);
    const etageZuschlag = ETAGEN.indexOf(etage) > 0 && aufzug === 'nein' ? ETAGEN.indexOf(etage) * 30 : 0;
    return base + etageZuschlag + (erschwerterZugang ? 50 : 0) + (parkverbot ? 30 : 0);
  })();

  const livePrice = isEntruempelung ? entruempelPrice : ((wohnflaeche * 4.412) + (entfernung * 2.52962) + (trageweg ? 80 : 0) + (halteverbot ? 60 : 0) + (sperrgut ? 120 : 0) + (verpackung ? 200 : 0));

  const kontaktValid = vorname && nachname && email && telefon;

  const goBack = () => {
    if (step === 'kontakt') setStep('details');
    if (step === 'details') setStep('rechner');
  };

  const handleSubmit = async () => {
    if (!kontaktValid || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Auftrag in Supabase speichern
      const { error: orderError } = await supabase.from('orders').insert([{
        service_category: selectedService === 'privatumzug' ? 'PRIVATUMZUG' : selectedService === 'firmenumzug' ? 'FIRMENUMZUG' : 'ENTRÜMPELUNG',
        customer_name: `${vorname} ${nachname}`,
        customer_email: email,
        customer_phone: telefon,
        move_date: datum || null,
        von_city: isEntruempelung ? 'Entrümpelung' : von,
        von_address: isEntruempelung ? '' : von,
        von_plz: '',
        von_floor: isEntruempelung ? etage : etageAuszug,
        von_lift: isEntruempelung ? aufzug === 'ja' : aufzugAuszug === 'ja',
        nach_city: isEntruempelung ? '' : nach,
        nach_address: '',
        nach_plz: '',
        nach_floor: isEntruempelung ? '' : etageEinzug,
        nach_lift: isEntruempelung ? false : aufzugEinzug === 'ja',
        size_info: isEntruempelung ? 'Entrümpelung' : `${wohnflaeche} m²`,
        sqm: isEntruempelung ? '' : `${wohnflaeche}`,
        rooms_info: '',
        additional_services: [
          ...(trageweg ? ['Langer Trageweg'] : []),
          ...(halteverbot ? ['Halteverbotszone'] : []),
          ...(sperrgut ? ['Schwere Sondergüter'] : []),
          ...(verpackung ? ['Verpackungsservice'] : []),
          ...(erschwerterZugang ? ['Erschwerter Zugang'] : []),
          ...(parkverbot ? ['Parkverbot'] : []),
        ],
        notes: isEntruempelung
          ? entruempelNotizen + (kontaktNotizen ? ' | ' + kontaktNotizen : '')
          : (umzugNotizen + (kontaktNotizen ? ' | ' + kontaktNotizen : '')),
        erreichbarkeit: erreichbarAb,
        estimated_price: livePrice > 0 ? livePrice : null,
        status: 'Neu',
      }]);

      if (orderError) throw orderError;

      // Admin-Benachrichtigung erstellen
      await supabase.from('notifications').insert([{
        type: 'NEW_ORDER',
        title: 'Neuer Kundenauftrag',
        message: `${vorname} ${nachname} hat eine Anfrage für ${isEntruempelung ? 'Entrümpelung' : 'Umzug'} gestellt.`,
        link: '/admin/dashboard/auftraege',
        is_read: false,
      }]);

      setStep('success');
      localStorage.removeItem(CALCULATOR_STORAGE_KEY);
    } catch (err: any) {
      console.error('Fehler beim Senden der Anfrage:', err);
      showToast('error', 'Fehler beim Senden', err.message || 'Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>{isInfoOpen && <InfoModal onClose={() => setIsInfoOpen(false)} />}</AnimatePresence>

      <div className="bg-slate-50 p-4 sm:p-6 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16" />

        <AnimatePresence mode="wait">

          {/* ══════════ STEP 1: RECHNER ══════════ */}
          {step === 'rechner' && (
            <motion.div key="rechner" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }}>
              <div className="grid md:grid-cols-2 gap-10 items-center relative z-10">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Wohnfläche</label>
                      <span className="text-2xl font-black text-brand-blue">{wohnflaeche} <span className="text-lg font-medium text-brand-blue/45">m²</span></span>
                    </div>
                    <input type="range" min="0" max="500" step="5" value={wohnflaeche} onChange={e => setWohnflaeche(+e.target.value)}
                      className="brand-range w-full cursor-pointer" />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>0 m²</span><span>500+ m²</span></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Entfernung</label>
                      <span className="text-2xl font-black text-brand-blue">{entfernung} <span className="text-lg font-medium text-brand-blue/45">km</span></span>
                    </div>
                    <input type="range" min="0" max="1000" step="10" value={entfernung} onChange={e => setEntfernung(+e.target.value)}
                      className="brand-range w-full cursor-pointer" />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>0 km</span><span>1000 km</span></div>
                  </div>
                </div>

                <div className="bg-white p-5 sm:p-8 rounded-[1.75rem] sm:rounded-[2rem] shadow-inner border border-slate-100 text-center flex flex-col items-center justify-center min-h-[280px]">
                  <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-2">Geschätzter Festpreis ab</p>
                  <div className="text-4xl sm:text-5xl md:text-6xl font-black text-brand-blue mb-6 sm:mb-8 tracking-tight break-words">{estimatedPrice} €</div>
                  <div className="w-full rounded-[1.5rem] border border-brand-blue/10 bg-brand-blue-soft/40 p-4 text-left mb-6">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-brand-blue mb-3">
                      <span>Preisaufteilung</span>
                      <span>Orientierung</span>
                    </div>
                    <div className="space-y-2">
                      {priceBreakdown.slice(0, 3).map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-700">{item.label}</span>
                            {'suffix' in item && item.suffix ? <span className="ml-1 text-slate-400">({item.suffix})</span> : null}
                          </div>
                          <span className="font-black text-slate-900">{item.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500">
                      Diese erste Schätzung basiert auf Wohnfläche und Entfernung. Im nächsten Schritt verfeinern Sonderleistungen und Zugangssituation den Preis.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setStep('details')}
                      className="flex-1 w-full bg-brand-blue text-white py-4 rounded-full font-extrabold shadow-lg hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-2">
                      Angebote vergleichen <ChevronRight className="w-5 h-5" />
                    </motion.button>
                    <button onClick={() => setIsInfoOpen(true)}
                      className="p-4 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all shadow-sm" title="Berechnungsgrundlage">
                      <Info className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 2: DETAILS ══════════ */}
          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }} className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 text-brand-blue text-xs font-bold uppercase tracking-widest mb-1">
                    <ShieldCheck className="w-4 h-4" /> Sichere Übermittlung
                  </div>
                  <h3 className="text-2xl font-black text-[#1e293b]">
                    {isEntruempelung ? 'Angaben zur Entrümpelung' : 'Details zum Umzug'}
                  </h3>
                </div>
                <button onClick={goBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors ml-4 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ProgressBar step="details" />

              {/* Service-Auswahl */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {SERVICES.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setSelectedService(id)}
                    className={`flex items-center justify-center gap-2 sm:flex-col p-3 rounded-2xl border-2 font-bold text-xs uppercase tracking-wider transition-all ${selectedService === id ? 'border-brand-blue bg-brand-blue-soft text-brand-blue shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:border-brand-blue/50'}`}>
                    <Icon className="w-6 h-6" />{label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* ── ENTRÜMPELUNG ── */}
                {isEntruempelung ? (
                  <motion.div key="e-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">Welche Gegenstände sollen entrümpelt werden?</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ENTRUEMPEL_ITEMS.map(item => (
                          <ItemCounter key={item.id} label={item.label} value={itemCounts[item.id]}
                            onChange={v => setItemCounts(p => ({ ...p, [item.id]: v }))} />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectField label="Etage" value={etage} onChange={setEtage} options={ETAGEN} />
                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Aufzug vorhanden?</label>
                        <div className="flex rounded-2xl overflow-hidden border-2 border-slate-200 h-[46px]">
                          {(['ja', 'nein'] as const).map(v => (
                            <button key={v} onClick={() => setAufzug(v)}
                              className={`flex-1 font-bold text-sm transition-all capitalize ${aufzug === v ? 'bg-brand-blue text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                              {v === 'ja' ? 'Ja' : 'Nein'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">Besonderheiten:</label>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <ToggleOption label="Erschwerter Zugang" desc="Langer Trageweg (>15m)" active={erschwerterZugang} onClick={() => setErschwerterZugang(!erschwerterZugang)} icon={AlertTriangle} />
                        <ToggleOption label="Parkverbot" desc="Keine Parkmöglichkeit vorm Haus" active={parkverbot} onClick={() => setParkverbot(!parkverbot)} icon={ParkingSquareOff} />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Sonstige Anmerkungen (Optional)</label>
                      <textarea rows={3} value={entruempelNotizen} onChange={e => setEntruempelNotizen(e.target.value)}
                        placeholder="z. B. besondere Gegenstände, Zugangssituation..."
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors text-sm text-black placeholder:text-slate-300 resize-none" />
                    </div>

                    {/* Live Preis */}
                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
                      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Geschätzter Fixpreis</div>
                        <div className="text-3xl font-black text-brand-blue">ab {entruempelPrice.toLocaleString('de-DE')} €</div>
                        <div className="text-xs text-slate-400 mt-0.5">inkl. Fahrtkosten & fachgerechter Entsorgung</div>
                      </div>
                      <button onClick={() => setIsInfoOpen(true)} className="text-xs font-bold text-brand-blue flex items-center gap-1 hover:underline">
                        <Info className="w-3.5 h-3.5" /> Live-Kalkulation
                      </button>
                      </div>
                      <div className="mt-4 rounded-xl border border-brand-blue/10 bg-brand-blue-soft/35 p-3">
                        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-blue">Zusammensetzung</div>
                        <div className="space-y-2">
                          {priceBreakdown.length > 0 ? priceBreakdown.map((item) => (
                            <div key={item.label} className="flex items-start justify-between gap-3 text-sm">
                              <span className="font-medium text-slate-600">{item.label}</span>
                              <span className="font-black text-slate-900">{item.amount.toLocaleString('de-DE')} €</span>
                            </div>
                          )) : (
                            <div className="text-sm text-slate-500">Wählen Sie Gegenstände oder Zusatzoptionen, um die Schätzung zu verfeinern.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* ── UMZUG / FIRMENUMZUG ── */
                  <motion.div key="u-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Wo ziehen Sie aus?</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input type="text" value={von} onChange={e => setVon(e.target.value)} placeholder="PLZ oder Ort"
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Wohin ziehen Sie um?</label>
                        <div className="relative">
                          <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input type="text" value={nach} onChange={e => setNach(e.target.value)} placeholder="PLZ oder Ort"
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Wunschtermin</label>
                      <div className="relative">
                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input type="date" value={datum} onChange={e => setDatum(e.target.value)}
                          className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black text-sm" />
                      </div>
                    </div>

                    {/* Etagen */}
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">Etagen & Aufzug</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Auszug (Von)</p>
                          <SelectField label="Etage" value={etageAuszug} onChange={setEtageAuszug} options={ETAGEN} />
                          <div className="mt-3">
                            <label className="text-xs font-bold text-slate-400 mb-2 block">Aufzug vorhanden?</label>
                            <div className="flex rounded-xl overflow-hidden border-2 border-slate-200 h-9">
                              {(['ja', 'nein'] as const).map(v => (
                                <button key={v} onClick={() => setAufzugAuszug(v)}
                                  className={`flex-1 font-bold text-xs transition-all ${aufzugAuszug === v ? 'bg-brand-blue text-white' : 'bg-white text-slate-500'}`}>
                                  {v === 'ja' ? 'Ja' : 'Nein'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Einzug (Nach)</p>
                          <SelectField label="Etage" value={etageEinzug} onChange={setEtageEinzug} options={ETAGEN} />
                          <div className="mt-3">
                            <label className="text-xs font-bold text-slate-400 mb-2 block">Aufzug vorhanden?</label>
                            <div className="flex rounded-xl overflow-hidden border-2 border-slate-200 h-9">
                              {(['ja', 'nein'] as const).map(v => (
                                <button key={v} onClick={() => setAufzugEinzug(v)}
                                  className={`flex-1 font-bold text-xs transition-all ${aufzugEinzug === v ? 'bg-brand-blue text-white' : 'bg-white text-slate-500'}`}>
                                  {v === 'ja' ? 'Ja' : 'Nein'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sonderleistungen */}
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">Sonderleistungen & Besonderheiten</label>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <ToggleOption label="Langer Trageweg" desc="Transportweg > 15m" active={trageweg} onClick={() => setTrageweg(!trageweg)} icon={PersonStanding} />
                        <ToggleOption label="Halteverbotszone" desc="Muss beantragt werden" active={halteverbot} onClick={() => setHalteverbot(!halteverbot)} icon={AlertTriangle} />
                        <ToggleOption label="Schwere Sondergüter" desc="Klavier, Tresor, Küche…" active={sperrgut} onClick={() => setSperrgut(!sperrgut)} icon={Dumbbell} />
                        <ToggleOption label="Verpackungsservice" desc="Kartons stellen & packen" active={verpackung} onClick={() => setVerpackung(!verpackung)} icon={PackageCheck} />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Sonstige Anmerkungen (Optional)</label>
                      <textarea rows={2} value={umzugNotizen} onChange={e => setUmzugNotizen(e.target.value)}
                        placeholder="z. B. Kühlschrank muss demontiert werden, Querstraße ohne LKW-Zufahrt..."
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors text-sm text-black placeholder:text-slate-300 resize-none" />
                    </div>

                    {/* Live Preis */}
                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
                      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Aktualisierter Schätzpreis</div>
                        <div className="text-3xl font-black text-brand-blue">
                          ab {livePrice > 0 ? livePrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} €
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">inkl. ausgewählter Sonderleistungen</div>
                      </div>
                      <button onClick={() => setIsInfoOpen(true)} className="text-xs font-bold text-brand-blue flex items-center gap-1 hover:underline">
                        <Info className="w-3.5 h-3.5" /> Info
                      </button>
                      </div>
                      <div className="mt-4 rounded-xl border border-brand-blue/10 bg-brand-blue-soft/35 p-3">
                        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-blue">Zusammensetzung</div>
                        <div className="space-y-2">
                          {priceBreakdown.map((item) => (
                            <div key={item.label} className="flex items-start justify-between gap-3 text-sm">
                              <div className="min-w-0">
                                <span className="font-medium text-slate-600">{item.label}</span>
                                {'suffix' in item && item.suffix ? <span className="ml-1 text-slate-400">({item.suffix})</span> : null}
                              </div>
                              <span className="font-black text-slate-900">{item.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">
                          Der Endpreis wird nach Ihren Detailangaben präziser. Etagen, Aufzug und Zusatzleistungen beeinflussen das Ergebnis direkt.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold mt-5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% kostenlos & unverbindlich
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setStep('kontakt')}
                className="w-full mt-4 bg-brand-blue text-white py-4 rounded-2xl font-extrabold text-base shadow-xl hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-3">
                Weiter zu meinen Kontaktdaten <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* ══════════ STEP 3: KONTAKT ══════════ */}
          {step === 'kontakt' && (
            <motion.div key="kontakt" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }} className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 text-brand-blue text-xs font-bold uppercase tracking-widest mb-1">
                    <ShieldCheck className="w-4 h-4" /> Fast geschafft!
                  </div>
                  <h3 className="text-2xl font-black text-[#1e293b]">Ihre Kontaktdaten</h3>
                  <p className="text-slate-400 text-sm mt-1">Damit die Unternehmen Sie kontaktieren können.</p>
                </div>
                <button onClick={goBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors ml-4 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ProgressBar step="kontakt" />

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Vorname *" icon={User} type="text" value={vorname} onChange={(e: any) => setVorname(e.target.value)} placeholder="Max" />
                  <InputField label="Nachname *" type="text" value={nachname} onChange={(e: any) => setNachname(e.target.value)} placeholder="Mustermann" />
                </div>
                <InputField label="E-Mail Adresse *" icon={Mail} type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="max@beispiel.de" />
                <InputField label="Telefonnummer *" icon={Phone} type="tel" value={telefon} onChange={(e: any) => setTelefon(e.target.value)} placeholder="+49 171 1234567" />

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Ab wann erreichbar? (Optional)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                    <input type="text" value={erreichbarAb} onChange={e => setErreichbarAb(e.target.value)} placeholder="z. B. Mo–Fr ab 17 Uhr, oder jederzeit"
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Zusätzliche Hinweise (Optional)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-slate-300 pointer-events-none" />
                    <textarea rows={3} value={kontaktNotizen} onChange={e => setKontaktNotizen(e.target.value)}
                      placeholder="Sonstige Wünsche oder Informationen an die Umzugsfirma..."
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-brand-blue transition-colors text-sm text-black placeholder:text-slate-300 resize-none" />
                  </div>
                </div>

                {/* Zusammenfassung */}
                <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-2xl p-4">
                  <p className="text-xs font-black text-brand-blue uppercase tracking-widest mb-3">Ihre Zusammenfassung</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div><span className="font-bold text-slate-400">Service:</span> {selectedService === 'privatumzug' ? 'Privatumzug' : selectedService === 'firmenumzug' ? 'Firmenumzug' : 'Entrümpelung'}</div>
                    {!isEntruempelung && von && <div><span className="font-bold text-slate-400">Von:</span> {von}</div>}
                    {!isEntruempelung && nach && <div><span className="font-bold text-slate-400">Nach:</span> {nach}</div>}
                    {!isEntruempelung && datum && <div><span className="font-bold text-slate-400">Termin:</span> {new Date(datum).toLocaleDateString('de-DE')}</div>}
                    <div><span className="font-bold text-slate-400">Schätzpreis:</span> ab {livePrice > 0 ? livePrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} €</div>
                  </div>
                  <div className="mt-3 rounded-xl bg-white/70 p-3">
                    <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-brand-blue">Wie sich der Preis zusammensetzt</div>
                    <div className="space-y-2">
                      {priceBreakdown.map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <span className="font-medium text-slate-600">{item.label}</span>
                            {'suffix' in item && item.suffix ? <span className="ml-1 text-slate-400">({item.suffix})</span> : null}
                          </div>
                          <span className="font-black text-slate-800">{item.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% kostenlos & unverbindlich
                </div>

                <motion.button
                  whileHover={{ scale: kontaktValid ? 1.02 : 1 }}
                  whileTap={{ scale: kontaktValid ? 0.97 : 1 }}
                  onClick={handleSubmit}
                  disabled={!kontaktValid || isSubmitting}
                  className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all ${
                    kontaktValid && !isSubmitting
                      ? 'bg-brand-blue text-white shadow-xl hover:bg-brand-blue-hover cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>Jetzt Angebote anfordern <ChevronRight className="w-5 h-5" /></>
                  )}
                </motion.button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  {[{ icon: Users, val: '50.000+', label: 'Kunden' }, { icon: BadgeCheck, val: '500+', label: 'Geprüfte Firmen' }, { icon: Star, val: '4.9/5', label: 'Ø Bewertung' }].map(({ icon: Icon, val, label }) => (
                    <div key={label} className="flex flex-col items-center text-center">
                      <Icon className="w-4 h-4 text-brand-blue mb-1" />
                      <div className="font-black text-slate-800 text-sm">{val}</div>
                      <div className="text-slate-400 text-[10px]">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 4: SUCCESS ══════════ */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 relative z-10">
              <ProgressBar step="success" />
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-[#1e293b] mb-3">Anfrage gesendet! 🎉</h3>
              <p className="text-slate-500 mb-2">Vielen Dank, <strong className="text-slate-700">{vorname}</strong>!</p>
              <p className="text-slate-400 text-sm mb-8">Wir suchen jetzt passende Unternehmen aus Ihrer Region und Sie erhalten zeitnah Angebote per E-Mail an <strong>{email}</strong>.</p>
              <button onClick={() => {
                setStep('rechner');
                setVorname(''); setNachname(''); setEmail(''); setTelefon('');
                setVon(''); setNach(''); setDatum('');
              }}
                className="inline-flex items-center gap-2 text-brand-blue font-bold hover:text-brand-blue-hover transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" /> Zurück zum Rechner
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}

