'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Network, Mail, MapPin, Phone, X, Calculator, ArrowRight, Send, Download
} from 'lucide-react';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import KostenrechnerWidget from '@/components/KostenrechnerWidget';
import { useToast } from '@/components/ToastProvider';
import { submitContactRequest } from '@/lib/publicForms';

// Social Media SVGs
const FacebookIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
const TwitterIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>;
const InstagramIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;

const articlesData: Record<string, any> = {
  'umzug-planen': {
    title: "Umzug planen: In 10 Schritten zum stressfreien Wechsel",
    tag: "Planung",
    img: "/umzug_planen.png",
    content: `
      Die Planung eines Umzugs kann schnell überwältigend wirken. Doch mit der richtigen Strategie wird der Wohnungswechsel zum Kinderspiel. 
      Hier sind die wichtigsten 10 Schritte, an denen Sie sich orientieren können:
      
      ### 1. Frühzeitig beginnen
      Beginnen Sie mindestens 3 Monate im Voraus. Kündigen Sie Ihre alte Wohnung fristgerecht und kümmern Sie sich um Strom, Internet und Nachsendeaufträge.
      
      ### 2. Ausmisten
      Ein Umzug ist die perfekte Gelegenheit, sich von altem Ballast zu trennen. Alles was Sie nicht mitnehmen müssen, spart bares Geld und Zeit.
      
      ### 3. Professionelle Hilfe vs. Self-Service
      Rechnen Sie genau durch: Einen professionellen Umzugsservice zu nutzen spart Nerven und verhindert teure, durch Laien verursachte Transportschäden.
      
      ### Fazit
      Wer sich an einen genauen Zeitplan hält, den überlassen Checklisten und transparente Budgets vor bösen Überraschungen schützen. Starten Sie jetzt Ihre Planung.
    `
  },
  'umzug-checkliste': {
    title: "Die ultimative Umzug-Checkliste (PDF & Online)",
    tag: "Planung",
    img: "/umzug_checkliste.png",
    content: `
      Sie suchen nach der absoluten Sicherheit, beim Umzug nichts Wichtiges zu vergessen? Unsere Checkliste ist Ihr Anker im Organisationschaos!
      
      ### Zwei Monate vorher:
      - Mietvertrag prüfen und kündigen.
      - Renovierungsarbeiten planen.
      - Umzugsfirmen kontaktieren und Angebote einholen.
      
      ### Einen Monat vorher:
      - Kartons packen beginnen (selten genutzte Dinge zuerst).
      - Halteverbotszonen für den Umzugstag beantragen.
      - Familie und Freunde als Helfer organisieren.
      
      ### Einen Tag vorher:
      - Wichtige Dokumente und Notfall-Koffer griffbereit stellen.
      - Pflanzen gießen und transportsicher machen.
      - Schlüsselübergabe mit dem alten Vermieter vorbereiten.
    `
  },
  'umzugskosten-berechnen': {
    title: "Umzugskosten berechnen: Was kostet es wirklich?",
    tag: "Finanzen",
    img: "/umzugskosten_berechnen.jpg",
    content: `
      "Was kostet eigentlich ein Umzug?" – Das ist die erste Frage, die man sich nach der Vertragsunterschrift der neuen Wohnung stellt.
      
      ### Zusammensetzung der Kosten
      Die Kosten für einen Umzug hängen maßgeblich ab von:
      - **Entfernung:** Wie weit ist die neue Bleibe entfernt? (Ein regionaler Umzug ist deutlich günstiger).
      - **Wohnfläche / Volumen:** Je mehr Möbel und Kartons transportiert werden müssen, desto größer muss der LKW sein.
      - **Stockwerke:** Besitzt das Haus keinen Aufzug, kann für den Mehraufwand ein Zuschlag anfallen.
      
      ### Wie kann ich sparen?
      Indem Sie im Vorfeld viele Angebote vergleichen, können Sie bis zu 40% der Kosten sparen. Oftmals lohnt es sich, Leistungen wie den Ab- und Aufbau der Möbel genau abzuwägen.
    `
  }
};

export default function RatgeberDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { showToast } = useToast();
  const { slug } = React.use(params);
  const article = articlesData[slug] || articlesData['umzug-planen'];

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const handleCopyEmail = () => {
    navigator.clipboard.writeText('kontakt@umzugsnetz.de');
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const handleContactSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!contactForm.firstName || !contactForm.lastName || !contactForm.email || !contactForm.message || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      await submitContactRequest({
        firstName: contactForm.firstName,
        lastName: contactForm.lastName,
        email: contactForm.email,
        message: contactForm.message,
        sourcePage: `/ratgeber/${slug}`,
      });
      showToast('success', 'Nachricht gesendet', 'Unser Team meldet sich zeitnah bei Ihnen.');
      setContactForm({
        firstName: '',
        lastName: '',
        email: '',
        message: '',
      });
    } catch (error: any) {
      showToast('error', 'Nachricht konnte nicht gesendet werden', error.message || 'Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <SiteHeader activeNav="ratgeber" theme="blue" />
      
      {/* ARTICLE CONTENT */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/#ratgeber" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-blue transition-colors font-bold text-sm mb-8">
            <ArrowRight className="w-4 h-4 rotate-180" /> Zurück zum Ratgeber
          </Link>
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-brand-blue-soft border border-brand-blue/20 text-brand-blue text-xs font-bold uppercase tracking-widest">
            {article.tag}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#1e293b] leading-tight mb-8">
            {article.title}
          </h1>
        </div>

        <div className="w-full h-[400px] mb-12 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
          <img src={article.img} alt={article.title} className="w-full h-full object-cover" />
        </div>

        <div className="prose prose-lg prose-slate max-w-none mb-20 whitespace-pre-line font-medium text-slate-600 leading-relaxed">
          {article.content}
        </div>

        {/* KONTAKTFELD ODER DOWNLOAD-BEREICH ODER RECHNER */}
        {slug === 'umzug-checkliste' ? (
          <div className="bg-emerald-50 rounded-[2.5rem] shadow-xl border border-emerald-100 p-8 md:p-12 text-center">
            <h3 className="text-3xl font-black text-[#1e293b] mb-4">Ihre Ultimative Umzugs-Checkliste</h3>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto text-lg">Laden Sie sich unsere Checkliste kostenlos als PDF herunter, um sie auszudrucken und während Ihres gesamten Umzugs griffbereit zu haben.</p>
            <motion.a 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              href="/Umzugs-Checkliste.pdf" 
              download 
              className="inline-flex bg-[#00b67a] justify-center items-center gap-3 text-white px-10 py-5 rounded-2xl font-bold hover:bg-[#009968] transition-colors shadow-lg text-lg"
            >
              <Download className="w-6 h-6" />
              Checkliste als PDF speichern
            </motion.a>
          </div>
        ) : slug === 'umzugskosten-berechnen' ? (
          <div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-[#1e293b] mb-2">Jetzt Kosten berechnen &amp; Angebote vergleichen</h3>
              <p className="text-slate-500">Nutzen Sie unseren Rechner und erhalten Sie direkt passende Angebote von geprüften Firmen.</p>
            </div>
            <KostenrechnerWidget />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-12">
            <h3 className="text-2xl font-black text-[#1e293b] mb-4">Haben Sie Fragen? Nehmen Sie direkt Kontakt auf</h3>
            <p className="text-slate-600 mb-8">Hinterlassen Sie uns eine Nachricht und unser Expertenteam wird sich zeitnah mit Ihnen in Verbindung setzen.</p>
            
            <form className="space-y-6" onSubmit={handleContactSubmit}>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Vorname</label>
                  <input
                    type="text"
                    value={contactForm.firstName}
                    onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, firstName: event.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="Max"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nachname</label>
                  <input
                    type="text"
                    value={contactForm.lastName}
                    onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, lastName: event.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="Mustermann"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">E-Mail Adresse</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, email: event.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="max@beispiel.de"
                    required
                  />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nachricht</label>
                <textarea
                  rows={4}
                  value={contactForm.message}
                  onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, message: event.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
                  placeholder="Ihre Anfrage an uns..."
                  required
                />
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting} className="w-full bg-brand-blue flex justify-center items-center gap-2 text-white px-8 py-4 rounded-xl font-bold hover:bg-brand-blue-hover transition-colors disabled:opacity-60">
                {submitting ? 'Wird gesendet...' : 'Nachricht senden'} <Send className="w-5 h-5" />
              </motion.button>
            </form>
          </div>
        )}
      </main>

      <SiteFooter theme="blue" />
    </div>
  );
}
