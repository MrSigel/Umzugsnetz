'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { useToast } from '@/components/ToastProvider';
import { submitPartnerApplication } from '@/lib/publicForms';
import {
  CheckCircle2, Truck, Trash2, Building2, BadgeCheck, Send, ChevronDown, TrendingUp, Users, Star, MapPin, ArrowRight
} from 'lucide-react';

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Mehr Aufträge',
    desc: 'Erhalten Sie täglich neue, qualifizierte Kundenanfragen direkt aus Ihrer Region.'
  },
  {
    icon: BadgeCheck,
    title: 'Geprüftes Netzwerk',
    desc: 'Nur seriöse Firmen. Wir prüfen jeden Partner sorgfältig bevor er aufgenommen wird.'
  },
  {
    icon: Users,
    title: '50.000+ Kunden',
    desc: 'Profitieren Sie von unserem wachsenden Kundenstamm und steigern Sie Ihren Umsatz.'
  },
  {
    icon: Star,
    title: 'Bewertungssystem',
    desc: 'Bauen Sie sich mit echten Kundenbewertungen online eine starke Reputation auf.'
  },
];

const SERVICES = [
  { value: '', label: 'Bitte Dienstleistung auswählen' },
  { value: 'privatumzug', label: 'Privatumzug' },
  { value: 'firmenumzug', label: 'Firmenumzug' },
  { value: 'entruempelung', label: 'Entrümpelung' },
  { value: 'umzug_entruempelung', label: 'Umzug & Entrümpelung' },
];

const RADIUS_OPTIONS = ['10 km', '25 km', '50 km', '75 km', '100 km', '150 km+'];

export default function PartnerPage() {
  const { showToast } = useToast();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [submitted, setSubmitted] = useState(false);
  const [datenschutz, setDatenschutz] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    firmenname: '',
    name: '',
    standort: '',
    radius: '50 km',
    email: '',
    telefon: '',
    dienstleistung: '',
  });

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('kontakt@umzugsnetz.de');
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isValid = form.firmenname && form.name && form.standort && form.email && form.telefon && form.dienstleistung && datenschutz;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <SiteHeader activeNav="partner" theme="blue" />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue-hover via-brand-blue to-brand-blue-3 text-white py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-80px] right-[-120px] w-[500px] h-[500px] bg-white/5 rounded-full" />
          <div className="absolute bottom-[-60px] left-[-80px] w-[350px] h-[350px] bg-white/5 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 backdrop-blur-sm px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-8">
              <BadgeCheck className="w-4 h-4 text-[#00ff9d]" /> Gemeinsam wachsen
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              Partner werden &<br />
              <span className="text-[#00ff9d]">mehr Aufträge erhalten</span>
            </h1>
            <p className="text-white/80 text-xl max-w-2xl mx-auto mb-10">
              Registrieren Sie Ihr Unternehmen und erhalten Sie passende Kundenanfragen aus Ihrer Region — 100 % kostenlos & unverbindlich.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-white/90">
              {[
                { val: '500+', label: 'Partner-Firmen' },
                { val: '50.000+', label: 'Zufriedene Kunden' },
                { val: '4.9★', label: 'Ø Bewertung' },
              ].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-black text-[#00ff9d]">{val}</div>
                  <div className="text-sm text-white/70">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-4xl font-black text-[#1e293b] mb-4">Warum <span className="text-brand-blue">Umzugsnetz-Partner</span> werden?</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Profitieren Sie von unserem deutschlandweiten Netzwerk und erhalten Sie regelmäßig neue Aufträge.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(({ icon: Icon, title, desc }, idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                className="group bg-slate-50 hover:bg-brand-blue rounded-[2rem] p-8 transition-all duration-300 cursor-default border-2 border-transparent hover:border-brand-blue hover:shadow-2xl"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 group-hover:bg-white/20 flex items-center justify-center mb-6 transition-colors">
                  <Icon className="w-7 h-7 text-brand-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-black text-slate-800 group-hover:text-white mb-3 transition-colors">{title}</h3>
                <p className="text-slate-500 group-hover:text-white/80 text-sm leading-relaxed transition-colors">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FORM SECTION */}
      <section className="py-20 bg-slate-50" id="partner-form">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT - Info */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 bg-brand-blue/10 border border-brand-blue/20 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest text-brand-blue mb-8">
                Jetzt starten
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-[#1e293b] leading-tight mb-6">
                Starten Sie hier<br />
                <span className="text-brand-blue">kostenlos durch</span>
              </h2>
              <p className="text-slate-500 text-lg mb-10 leading-relaxed">
                Füllen Sie das Formular aus und wir melden uns innerhalb von 24 Stunden bei Ihnen. Nach der Freischaltung erhalten Sie sofort Zugang zu Kundenanfragen aus Ihrer Region.
              </p>

              <div className="space-y-5">
                {[
                  { icon: CheckCircle2, text: 'Kostenlose Registrierung ohne versteckte Gebühren' },
                  { icon: CheckCircle2, text: 'Sofortige Anfragen nach Freischaltung' },
                  { icon: CheckCircle2, text: 'Einzugsgebiet nach Ihren Wünschen einstellbar' },
                  { icon: CheckCircle2, text: 'Persönlicher Ansprechpartner & Support' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-slate-700 font-medium">{text}</span>
                  </div>
                ))}
              </div>

              {/* Service Logos */}
              <div className="mt-12 pt-8 border-t border-slate-200">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Für wen ist das geeignet?</p>
                <div className="flex gap-4">
                  {[
                    { icon: Truck, label: 'Umzugsunternehmen' },
                    { icon: Trash2, label: 'Entrümpelungsfirmen' },
                    { icon: Building2, label: 'Firmenumzüge' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 flex-1 text-center">
                      <Icon className="w-6 h-6 text-brand-blue" />
                      <span className="text-xs font-bold text-slate-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* RIGHT - Form */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 md:p-10"
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 bg-brand-blue/10 rounded-2xl">
                        <BadgeCheck className="w-7 h-7 text-brand-blue" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-[#1e293b]">Partner werden</h3>
                        <p className="text-slate-400 text-sm">Registrieren Sie Ihr Unternehmen</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Firmenname *</label>
                          <input
                            type="text" value={form.firmenname} onChange={e => handleChange('firmenname', e.target.value)}
                            placeholder="z. B. Müller Umzüge GmbH"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Ihr Name *</label>
                          <input
                            type="text" value={form.name} onChange={e => handleChange('name', e.target.value)}
                            placeholder="Max Mustermann"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Standort *</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                              type="text" value={form.standort} onChange={e => handleChange('standort', e.target.value)}
                              placeholder="z. B. Berlin"
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Einzugsradius (km) *</label>
                          <div className="relative">
                            <select
                              value={form.radius} onChange={e => handleChange('radius', e.target.value)}
                              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-bold text-black appearance-none cursor-pointer text-sm"
                            >
                              {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">E-Mail Adresse *</label>
                          <input
                            type="email" value={form.email} onChange={e => handleChange('email', e.target.value)}
                            placeholder="z. B. max@firma.de"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Telefonnummer *</label>
                          <input
                            type="tel" value={form.telefon} onChange={e => handleChange('telefon', e.target.value)}
                            placeholder="z. B. 0171 1234567"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black placeholder:text-slate-300 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Dienstleistung *</label>
                        <div className="relative">
                          <select
                            value={form.dienstleistung} onChange={e => handleChange('dienstleistung', e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-brand-blue transition-colors font-medium text-black appearance-none cursor-pointer text-sm"
                          >
                            {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-2xl p-4">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          Nach Ihrer Freischaltung können Sie im Dashboard Ihre Testphase starten und bis zu 5 Kundeanfragen in Ihrer Region kostenfrei erhalten. Abhängig von Menge und Verfügbarkeit.
                        </p>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div
                          onClick={() => setDatenschutz(!datenschutz)}
                          className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${datenschutz ? 'bg-brand-blue border-brand-blue' : 'border-slate-300 bg-white group-hover:border-brand-blue/50'}`}
                        >
                          {datenschutz && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="text-slate-500 text-sm leading-relaxed" onClick={() => setDatenschutz(!datenschutz)}>
                          Ich habe die <Link href="/datenschutz" className="text-brand-blue hover:underline font-semibold">Datenschutzerklärung</Link> gelesen und stimme dieser zu.
                        </span>
                      </label>

                      <motion.button
                        whileHover={{ scale: isValid ? 1.02 : 1 }}
                        whileTap={{ scale: isValid ? 0.98 : 1 }}
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
                              sourcePage: '/partner',
                            });
                            showToast('success', 'Anfrage gesendet', 'Wir prüfen Ihre Angaben und melden uns zeitnah.');
                            setSubmitted(true);
                          } catch (error: any) {
                            showToast('error', 'Anfrage fehlgeschlagen', error.message || 'Bitte versuchen Sie es erneut.');
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        className={`w-full py-5 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3 transition-all ${
                          isValid
                            ? 'bg-brand-blue text-white shadow-xl hover:bg-brand-blue-hover cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {submitting ? 'Wird gesendet...' : 'Jetzt Partner werden'} <Send className="w-5 h-5" />
                      </motion.button>

                      <p className="text-slate-400 text-xs text-center leading-relaxed">
                        Mit der Absendung dieses Formulars stimmen Sie zu, dass wir Ihre Daten zur Kontaktaufnahme und für Angebotszwecke nutzen dürfen.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-12 text-center"
                  >
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-black text-[#1e293b] mb-4">Willkommen an Bord! 🎉</h3>
                    <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                      Ihre Anfrage ist eingegangen. Unser Team wird sich innerhalb von <strong className="text-slate-700">24 Stunden</strong> bei Ihnen melden und Sie freischalten.
                    </p>
                    <Link href="/">
                      <motion.button whileHover={{ scale: 1.02 }} className="inline-flex items-center gap-2 text-brand-blue font-bold hover:text-brand-blue-hover transition-colors">
                        <ArrowRight className="w-4 h-4 rotate-180" /> Zurück zur Startseite
                      </motion.button>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      <SiteFooter theme="blue" />
    </div>
  );
}
