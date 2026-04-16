'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { useToast } from '@/components/ToastProvider';
import { submitPartnerApplication } from '@/lib/publicForms';
import {
  CheckCircle2, Truck, TrendingUp, Users, BadgeCheck, Star,
  ArrowRight, Send, ChevronDown, MapPin, Award
} from 'lucide-react';

const BENEFITS = [
  { icon: TrendingUp, title: 'Mehr Umzugsaufträge', desc: 'Erhalten Sie täglich neue, vorqualifizierte Anfragen von Privat- und Firmenkunden direkt aus Ihrer Wunschregion.' },
  { icon: BadgeCheck, title: 'Geprüftes Netzwerk', desc: 'Nur seriöse Umzugsbetriebe. Wir prüfen Gewerbenachweise und Versicherungsschutz jedes Partners.' },
  { icon: Users, title: '50.000+ Kunden', desc: 'Profitieren Sie von einem der größten Vergleichsportale Deutschlands und steigern Sie Ihren Jahresumsatz.' },
  { icon: Star, title: 'Bewertungssystem', desc: 'Bauen Sie mit echten Kundenbewertungen online eine starke Reputation im Umzugsmarkt auf.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Registrieren', desc: 'Füllen Sie das Formular aus und wir schalten Sie innerhalb von 24 Stunden frei.' },
  { step: '02', title: 'Anfragen empfangen', desc: 'Sie erhalten passende Umzugsanfragen aus Ihrem definierten Einzugsgebiet direkt per E-Mail.' },
  { step: '03', title: 'Angebote unterbreiten', desc: 'Kontaktieren Sie den Kunden, reichen Sie Ihr Angebot ein und gewinnen Sie den Auftrag.' },
];

const RADIUS_OPTIONS = ['10 km', '25 km', '50 km', '75 km', '100 km', '150 km+'];
const SERVICES_UMZUG = [
  { value: '', label: 'Bitte auswählen' },
  { value: 'privatumzug', label: 'Privatumzug' },
  { value: 'firmenumzug', label: 'Firmenumzug' },
  { value: 'beide', label: 'Privat- & Firmenumzug' },
];

export default function PartnerUmzugPage() {
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [datenschutz, setDatenschutz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ firmenname: '', name: '', standort: '', radius: '50 km', email: '', telefon: '', dienstleistung: '' });
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));
  const isValid = form.firmenname && form.name && form.standort && form.email && form.telefon && form.dienstleistung && datenschutz;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      <SiteHeader activeNav="partner" />

      {/* HERO – Blauer Gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0050a0] via-[#0075c9] to-[#00a8f3] text-white py-28">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-[#00c8ff]/10 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-white/5 rounded-full" />
          <Truck className="absolute top-20 right-20 w-64 h-64 text-white/5 hidden xl:block" strokeWidth={0.5} />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-8">
              <Truck className="w-4 h-4" /> Für Umzugsunternehmen
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              Mehr Aufträge.<br /><span className="text-[#7de8ff]">Weniger Leerlauf.</span>
            </h1>
            <p className="text-white/80 text-xl mb-10 leading-relaxed max-w-2xl">
              Registrieren Sie Ihr Umzugsunternehmen kostenlos und erhalten Sie qualifizierte Anfragen von Privat- und Firmenkunden direkt in Ihre Inbox.
            </p>
            <div className="flex flex-wrap gap-8">
              {[{ val: '500+', label: 'Partner-Firmen' }, { val: '50.000+', label: 'Zufriedene Kunden' }, { val: '4.9★', label: 'Ø Bewertung' }].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-black text-[#7de8ff]">{val}</div>
                  <div className="text-sm text-white/70">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SO FUNKTIONIERT'S */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-[#1e293b] mb-4">So einfach funktioniert es</h2>
            <p className="text-slate-500 text-lg">In drei Schritten zu mehr Aufträgen.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }, idx) => (
              <motion.div key={step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.15 }}
                className="relative bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow">
                <div className="text-7xl font-black text-[#00a8f3]/10 absolute top-4 right-6">{step}</div>
                <div className="w-12 h-12 rounded-2xl bg-[#00a8f3] flex items-center justify-center text-white font-black text-lg mb-6">{step}</div>
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
            <h2 className="text-4xl font-black text-[#1e293b] mb-4">Warum <span className="text-[#00a8f3]">Umzugsnetz-Partner</span> werden?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(({ icon: Icon, title, desc }, idx) => (
              <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                className="group bg-slate-50 hover:bg-[#00a8f3] rounded-[2rem] p-8 transition-all duration-300 border-2 border-transparent hover:shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-[#00a8f3]/10 group-hover:bg-white/20 flex items-center justify-center mb-6 transition-colors">
                  <Icon className="w-6 h-6 text-[#00a8f3] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-black text-slate-800 group-hover:text-white mb-2 transition-colors">{title}</h3>
                <p className="text-slate-500 group-hover:text-white/80 text-sm leading-relaxed transition-colors">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FORM SECTION */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 bg-[#00a8f3]/10 border border-[#00a8f3]/20 px-5 py-2 rounded-full text-sm font-bold text-[#00a8f3] uppercase tracking-widest mb-8">Jetzt durchstarten</div>
              <h2 className="text-4xl font-black text-[#1e293b] mb-6">Als Umzugsunternehmen<br /><span className="text-[#00a8f3]">Partner werden</span></h2>
              <p className="text-slate-500 text-lg mb-10 leading-relaxed">Melden Sie sich jetzt an und erhalten Sie bereits in der Testphase bis zu 5 kostenlose Kundenanfragen aus Ihrer Region.</p>
              <div className="space-y-4 mb-10">
                {['Kostenlose Registrierung', 'Sofortige Anfragen nach Freischaltung', 'Einzugsgebiet selbst definierbar', 'Persönlicher Support & Ansprechpartner', 'DSGVO-konform & datenschutzsicher'].map(t => (
                  <div key={t} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#00a8f3]/10 flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-4 h-4 text-[#00a8f3]" /></div>
                    <span className="font-medium text-slate-700">{t}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#00a8f3]/5 border border-[#00a8f3]/15 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3"><Award className="w-5 h-5 text-[#00a8f3]" /><span className="font-black text-slate-800 text-sm uppercase tracking-wider">Unsere Garantie</span></div>
                <p className="text-slate-500 text-sm leading-relaxed">Wir finanzieren uns ausschließlich über unsere Partner. Für Sie entstehen keine versteckten Kosten oder Mindestabnahmen.</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 md:p-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 bg-[#00a8f3]/10 rounded-2xl"><Truck className="w-7 h-7 text-[#00a8f3]" /></div>
                      <div>
                        <h3 className="text-xl font-black text-[#1e293b]">Als Umzugsunternehmen registrieren</h3>
                        <p className="text-slate-400 text-sm">100% kostenlos & unverbindlich</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Firmenname *</label>
                          <input type="text" value={form.firmenname} onChange={e => set('firmenname', e.target.value)} placeholder="z. B. Müller Umzüge GmbH"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00a8f3] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div>
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Ihr Name *</label>
                          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Max Mustermann"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00a8f3] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Standort *</label>
                          <div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input type="text" value={form.standort} onChange={e => set('standort', e.target.value)} placeholder="Berlin"
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#00a8f3] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div></div>
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Einzugsradius *</label>
                          <div className="relative">
                            <select value={form.radius} onChange={e => set('radius', e.target.value)}
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00a8f3] transition-colors text-sm font-bold text-slate-700 appearance-none cursor-pointer">
                              {RADIUS_OPTIONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">E-Mail *</label>
                          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="max@firma.de"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00a8f3] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div>
                        <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Telefon *</label>
                          <input type="tel" value={form.telefon} onChange={e => set('telefon', e.target.value)} placeholder="0171 1234567"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00a8f3] transition-colors text-sm font-medium text-slate-700 placeholder:text-slate-300" /></div>
                      </div>
                      <div><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Dienstleistung *</label>
                        <div className="relative">
                          <select value={form.dienstleistung} onChange={e => set('dienstleistung', e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#00a8f3] transition-colors text-sm font-medium text-slate-700 appearance-none cursor-pointer">
                            {SERVICES_UMZUG.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>
                      <div className="bg-[#00a8f3]/5 border border-[#00a8f3]/15 rounded-2xl p-4 text-sm text-slate-500 leading-relaxed">
                        Nach Freischaltung erhalten Sie bis zu 5 kostenlose Anfragen in der Testphase — abhängig von Verfügbarkeit und Region.
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <div onClick={() => setDatenschutz(!datenschutz)}
                          className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${datenschutz ? 'bg-[#00a8f3] border-[#00a8f3]' : 'border-slate-300 bg-white'}`}>
                          {datenschutz && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-slate-400 text-sm" onClick={() => setDatenschutz(!datenschutz)}>
                          Ich habe die <Link href="/datenschutz" className="text-[#00a8f3] hover:underline font-semibold">Datenschutzerklärung</Link> gelesen und stimme zu.
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
                              sourcePage: '/partner/umzug',
                            });
                            showToast('success', 'Anfrage gesendet', 'Ihre Umzugs-Partneranfrage wurde gespeichert.');
                            setSubmitted(true);
                          } catch (error: any) {
                            showToast('error', 'Anfrage fehlgeschlagen', error.message || 'Bitte versuchen Sie es erneut.');
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        className={`w-full py-5 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all ${isValid ? 'bg-[#00a8f3] text-white shadow-xl hover:bg-[#0092d6] cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                        {submitting ? 'Wird gesendet...' : 'Als Umzugsunternehmen registrieren'} <Send className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl p-12 text-center border border-slate-100">
                    <div className="w-24 h-24 bg-[#00a8f3]/10 rounded-full flex items-center justify-center mx-auto mb-8">
                      <CheckCircle2 className="w-12 h-12 text-[#00a8f3]" />
                    </div>
                    <h3 className="text-3xl font-black text-[#1e293b] mb-4">Willkommen an Bord! 🚛</h3>
                    <p className="text-slate-500 mb-8">Ihr Umzugsunternehmen wird innerhalb von <strong className="text-slate-700">24 Stunden</strong> freigeschaltet.</p>
                    <Link href="/"><motion.button whileHover={{ scale: 1.02 }} className="inline-flex items-center gap-2 text-[#00a8f3] font-bold"><ArrowRight className="w-4 h-4 rotate-180" /> Zurück zur Startseite</motion.button></Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
