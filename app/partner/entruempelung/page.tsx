'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { useToast } from '@/components/ToastProvider';
import { submitPartnerApplication } from '@/lib/publicForms';
import {
  CheckCircle2, Trash2, TrendingUp, Users, BadgeCheck, Star,
  ArrowRight, Send, ChevronDown, Award, Recycle, Leaf, MapPin
} from 'lucide-react';

const BENEFITS = [
  { icon: TrendingUp, title: 'Mehr Entrümpelungsaufträge', desc: 'Erhalten Sie täglich neue, vorqualifizierte Anfragen von Privat- und Gewerbeobjekten direkt in Ihrer Region.' },
  { icon: BadgeCheck, title: 'Geprüftes Netzwerk', desc: 'Nur seriöse Entrümpelungsbetriebe. Wir prüfen Gewerbenachweise, Entsorgungsnachweise und Versicherungsschutz.' },
  { icon: Recycle, title: 'Nachhaltige Entsorgung', desc: 'Heben Sie Ihre Expertise in nachhaltiger und fachgerechter Entsorgung hervor — das schätzen unsere Kunden.' },
  { icon: Star, title: 'Bewertungssystem', desc: 'Bauen Sie mit echten Kundenbewertungen eine starke Online-Reputation im Entrümpelungsmarkt auf.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Registrieren', desc: 'Füllen Sie das Formular aus und wir schalten Sie innerhalb von 24 Stunden frei.' },
  { step: '02', title: 'Anfragen empfangen', desc: 'Sie erhalten Entrümpelungsanfragen aus Ihrem definierten Einzugsgebiet — mit allen Details zu Gegenständen und Umfang.' },
  { step: '03', title: 'Aufträge gewinnen', desc: 'Kontaktieren Sie den Kunden, unterbreiten Sie ein Angebot und gewinnen Sie den Auftrag nachhaltig.' },
];

const RADIUS_OPTIONS = ['10 km', '25 km', '50 km', '75 km', '100 km', '150 km+'];
const SERVICES_ENTRUEMPEL = [
  { value: '', label: 'Bitte auswählen' },
  { value: 'wohnungen', label: 'Wohnungsentrümpelung' },
  { value: 'keller', label: 'Keller & Dachboden' },
  { value: 'hausentraempelung', label: 'Haushaltsauflösung' },
  { value: 'buero', label: 'Büro & Gewerbe' },
  { value: 'alle', label: 'Alle Arten von Entrümpelung' },
];

export default function PartnerEntruempelungPage() {
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [datenschutz, setDatenschutz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ firmenname: '', name: '', standort: '', radius: '50 km', email: '', telefon: '', dienstleistung: '' });
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));
  const isValid = form.firmenname && form.name && form.standort && form.email && form.telefon && form.dienstleistung && datenschutz;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      <SiteHeader activeNav="partner" theme="green" />

      {/* HERO – Grüner Gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#004d33] via-[#007a50] to-[#00b67a] text-white py-28">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-[#00ff9d]/10 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-white/5 rounded-full" />
          <Trash2 className="absolute top-20 right-20 w-64 h-64 text-white/5 hidden xl:block" strokeWidth={0.5} />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-8">
                <Trash2 className="w-4 h-4" /> Für Entrümpelungsunternehmen
              </div>
              <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
                Volle Auslastung.<br />
                <span className="text-[#00ff9d]">Mehr Umsatz.</span>
              </h1>
              <p className="text-white/80 text-xl mb-10 leading-relaxed max-w-2xl">
                Registrieren Sie Ihr Entrümpelungsunternehmen kostenlos und erhalten Sie qualifizierte Anfragen — von Wohnungsentrümpelungen bis zu kompletten Haushaltsauflösungen.
              </p>
              <div className="flex flex-wrap gap-8">
                {[{ val: '500+', label: 'Partner-Firmen' }, { val: '50.000+', label: 'Zufriedene Kunden' }, { val: '4.9★', label: 'Ø Bewertung' }].map(({ val, label }) => (
                  <div key={label} className="text-center">
                    <div className="text-3xl font-black text-[#00ff9d]">{val}</div>
                    <div className="text-sm text-white/70">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SO FUNKTIONIERT'S */}
      <section className="py-20 bg-[#f0fdf6]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-[#1e293b] mb-4">In 3 Schritten zu mehr Aufträgen</h2>
            <p className="text-slate-500 text-lg">Einfach, schnell und ohne Risiko.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }, idx) => (
              <motion.div key={step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.15 }}
                className="relative bg-white rounded-[2rem] p-8 border border-emerald-100 shadow-sm hover:shadow-xl transition-shadow">
                <div className="text-7xl font-black text-[#00b67a]/10 absolute top-4 right-6">{step}</div>
                <div className="w-12 h-12 rounded-2xl bg-[#00b67a] flex items-center justify-center text-white font-black text-lg mb-6">{step}</div>
                <h3 className="text-xl font-black text-slate-800 mb-3">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-[#1e293b] mb-4">Warum <span className="text-[#00b67a]">Umzugsnetz-Partner</span> werden?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(({ icon: Icon, title, desc }, idx) => (
              <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                className="group bg-[#f0fdf6] hover:bg-[#00b67a] rounded-[2rem] p-8 transition-all duration-300 border-2 border-transparent hover:shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-[#00b67a]/15 group-hover:bg-white/20 flex items-center justify-center mb-6 transition-colors">
                  <Icon className="w-6 h-6 text-[#00b67a] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-black text-slate-800 group-hover:text-white mb-2 transition-colors">{title}</h3>
                <p className="text-slate-500 group-hover:text-white/80 text-sm leading-relaxed transition-colors">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* UNIQUE – Was Entrümpelung besonders macht */}
      <section className="py-16 bg-[#f0fdf6]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-[#004d33] to-[#00b67a] rounded-[3rem] p-10 md:p-14 text-white flex flex-col md:flex-row items-center gap-10">
            <div className="flex-shrink-0 w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center">
              <Leaf className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-black mb-3">Nachhaltigkeit als Ihr Wettbewerbsvorteil</h3>
              <p className="text-white/80 text-lg leading-relaxed">
                Immer mehr Kunden legen Wert auf verantwortungsvolle Entsorgung. Zeigen Sie Ihren Kunden, dass Sie fachgerecht, recyclingbewusst und DSGVO-konform arbeiten — direkt in Ihrem Profil auf Umzugsnetz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FORM SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* LEFT */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 bg-[#00b67a]/10 border border-[#00b67a]/20 px-5 py-2 rounded-full text-sm font-bold text-[#00b67a] uppercase tracking-widest mb-8">
                Jetzt durchstarten
              </div>
              <h2 className="text-4xl font-black text-[#1e293b] mb-6">Als Entrümpelungsfirma<br /><span className="text-[#00b67a]">Partner werden</span></h2>
              <p className="text-slate-500 text-lg mb-10 leading-relaxed">Melden Sie sich kostenlos an und erhalten Sie in der Testphase bis zu 5 Entrümpelungsanfragen aus Ihrer Region — ohne Risiko.</p>
              <div className="space-y-4 mb-10">
                {['Kostenlose Registrierung ohne versteckte Gebühren', 'Anfragen mit vollständigen Gegenstandslisten', 'Einzugsgebiet selbst frei definierbar', 'Persönlicher Support & Ansprechpartner', 'DSGVO-konform & datenschutzsicher'].map(t => (
                  <div key={t} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#00b67a]/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#00b67a]" />
                    </div>
                    <span className="font-medium text-slate-700">{t}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#00b67a]/5 border border-[#00b67a]/15 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-5 h-5 text-[#00b67a]" />
                  <span className="font-black text-slate-800 text-sm uppercase tracking-wider">Unsere Garantie</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">Für Sie als Entrümpelungsunternehmen entstehen keine versteckten Kosten oder Mindestabnahmen. Wir finanzieren uns ausschließlich über unser Partnernetzwerk.</p>
              </div>
            </motion.div>

            {/* RIGHT – FORM */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl border border-emerald-100 p-8 md:p-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 bg-[#00b67a]/10 rounded-2xl"><Trash2 className="w-7 h-7 text-[#00b67a]" /></div>
                      <div>
                        <h3 className="text-xl font-black text-[#1e293b]">Als Entrümpelungsfirma registrieren</h3>
                        <p className="text-slate-400 text-sm">100% kostenlos & unverbindlich</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Firmenname *</label>
                          <input type="text" value={form.firmenname} onChange={e => set('firmenname', e.target.value)} placeholder="z. B. Sauber GmbH"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00b67a] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div>
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Ihr Name *</label>
                          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Max Mustermann"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00b67a] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Standort *</label>
                          <div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input type="text" value={form.standort} onChange={e => set('standort', e.target.value)} placeholder="Berlin"
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#00b67a] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div></div>
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Einzugsradius *</label>
                          <div className="relative">
                            <select value={form.radius} onChange={e => set('radius', e.target.value)}
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00b67a] transition-colors text-sm font-bold text-slate-700 appearance-none cursor-pointer">
                              {RADIUS_OPTIONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">E-Mail *</label>
                          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="max@firma.de"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00b67a] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div>
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Telefon *</label>
                          <input type="tel" value={form.telefon} onChange={e => set('telefon', e.target.value)} placeholder="0171 1234567"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00b67a] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div>
                      </div>
                      <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Art der Entrümpelung *</label>
                        <div className="relative">
                          <select value={form.dienstleistung} onChange={e => set('dienstleistung', e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00b67a] transition-colors text-sm font-medium text-slate-700 appearance-none cursor-pointer">
                            {SERVICES_ENTRUEMPEL.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>

                      <div className="bg-[#00b67a]/5 border border-[#00b67a]/15 rounded-2xl p-4 text-sm text-slate-500 leading-relaxed">
                        Nach Freischaltung erhalten Sie bis zu 5 kostenlose Entrümpelungsanfragen in der Testphase — mit vollständiger Gegenstandsliste für schnelle Kalkulation.
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <div onClick={() => setDatenschutz(!datenschutz)}
                          className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${datenschutz ? 'bg-[#00b67a] border-[#00b67a]' : 'border-slate-300 bg-white'}`}>
                          {datenschutz && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-slate-400 text-sm" onClick={() => setDatenschutz(!datenschutz)}>
                          Ich habe die <Link href="/datenschutz" className="text-[#00b67a] hover:underline font-semibold">Datenschutzerklärung</Link> gelesen und stimme zu.
                        </span>
                      </label>

                      <motion.button whileHover={{ scale: isValid ? 1.02 : 1 }} whileTap={{ scale: isValid ? 0.98 : 1 }}
                        onClick={async () => {
                          if (!isValid || submitting) {
                            return;
                          }

                          try {
                            setSubmitting(true);
                            await submitPartnerApplication({
                              companyName: form.firmenname,
                              contactName: form.name,
                              email: form.email,
                              phone: form.telefon,
                              location: form.standort,
                              radius: form.radius,
                              service: form.dienstleistung,
                              sourcePage: '/partner/entruempelung',
                            });
                            showToast('success', 'Anfrage gesendet', 'Ihre Entrümpelungs-Partneranfrage wurde gespeichert.');
                            setSubmitted(true);
                          } catch (error: any) {
                            showToast('error', 'Anfrage fehlgeschlagen', error.message || 'Bitte versuchen Sie es erneut.');
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        className={`w-full py-5 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all ${isValid ? 'bg-[#00b67a] text-white shadow-xl hover:bg-[#009968] cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                        {submitting ? 'Wird gesendet...' : 'Als Entrümpelungsfirma registrieren'} <Send className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl p-12 text-center border border-emerald-100">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
                      <CheckCircle2 className="w-12 h-12 text-[#00b67a]" />
                    </div>
                    <h3 className="text-3xl font-black text-[#1e293b] mb-4">Willkommen an Bord! ♻️</h3>
                    <p className="text-slate-500 mb-8">Ihr Unternehmen wird innerhalb von <strong className="text-slate-700">24 Stunden</strong> freigeschaltet.</p>
                    <Link href="/"><motion.button whileHover={{ scale: 1.02 }} className="inline-flex items-center gap-2 text-[#00b67a] font-bold"><ArrowRight className="w-4 h-4 rotate-180" /> Zurück zur Startseite</motion.button></Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      <SiteFooter theme="green" />
    </div>
  );
}
