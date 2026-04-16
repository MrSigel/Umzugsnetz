'use client';

import React from 'react';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Eye, CheckCircle2 } from 'lucide-react';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <SiteHeader activeNav="none" theme="blue" />

      <main className="max-w-4xl mx-auto px-4 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-16"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#00b67a]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-[#1e293b]">Cookies & Datenschutz</h1>
          </div>

          <div className="prose prose-slate prose-headings:text-[#1e293b] prose-headings:font-black max-w-none space-y-12">
            
            <section>
              <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
                <Lock className="w-6 h-6 text-[#00a8f3]" /> 1. Datenschutz auf einen Blick
              </h2>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-slate-600">
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold mb-4">Datenerfassung auf dieser Website</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
                Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle“ in dieser Datenschutzerklärung entnehmen.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong>Wie erfassen wir Ihre Daten?</strong><br />
                Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular oder den Kostenrechner eingeben.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
                <Eye className="w-6 h-6 text-[#00a8f3]" /> 2. Allgemeine Hinweise und Pflichtinformationen
              </h2>
              <h3 className="text-xl font-bold mb-4">Hinweis zur verantwortlichen Stelle</h3>
              <div className="text-slate-600 leading-relaxed pl-4 border-l-4 border-emerald-500 py-2">
                Umzugsnetz Digital GmbH<br />
                Musterstraße 123<br />
                10115 Berlin<br />
                Telefon: +49 (0) 30 12345678<br />
                E-Mail: kontakt@umzugsnetz.de
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#00a8f3]" /> 3. Datenerfassung im Kostenrechner
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Wenn Sie unseren Kostenrechner nutzen, werden die von Ihnen eingegebenen Daten (z. B. Wohnfläche, Adressen, Name, Telefonnummer, E-Mail) zum Zweck der Angebotserstellung an bis zu 5 qualifizierte Partnerunternehmen in unserem Netzwerk weitergeleitet. Dies erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. vorvertragliche Maßnahmen).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#00a8f3]" /> 4. Cookies
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Technisch notwendige Cookies (z. B. für den Kostenrechner oder Ihre Cookie-Präferenzen) werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert. Andere Cookies (Analyse, Marketing) werden nur mit Ihrer ausdrücklichen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) verwendet.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4">5. Ihre Rechte</h2>
              <p className="text-slate-600 leading-relaxed">
                Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-4 marker:text-emerald-500">
                <li>Recht auf Auskunft</li>
                <li>Recht auf Berichtigung</li>
                <li>Recht auf Löschung</li>
                <li>Recht auf Einschränkung der Verarbeitung</li>
                <li>Recht auf Datenübertragbarkeit</li>
              </ul>
            </section>

            <section className="pt-8 border-t border-slate-100">
              <p className="text-sm text-slate-400">
                Stand: April 2024. Diese Datenschutzerklärung wurde zum Schutz Ihrer Identität erstellt.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <SiteFooter theme="blue" />
    </div>
  );
}
