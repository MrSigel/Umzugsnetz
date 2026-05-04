'use client';

import React from 'react';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { motion } from 'framer-motion';
import { Building, FileText, Mail, Phone } from 'lucide-react';

export default function ImpressumPage() {
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
            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-slate-900">Impressum</h1>
          </div>

          <div className="space-y-12 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-brand-blue" />
                Angaben gemäß § 5 DDG
              </h2>
              <div className="pl-7 space-y-2">
                <p className="font-bold text-slate-800 text-lg">Dean Zander</p>
                <p>Welserstraße 3</p>
                <p>87463 Dietmannsried</p>
                <p>Deutschland</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-blue" />
                Kontakt
              </h2>
              <div className="pl-7 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Telefon: 01722699945</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>E-Mail: kontakt@umzugsnetz.de</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">Hinweis zur Anbieterkennzeichnung</h2>
              <p>
                Dieses Angebot wird unter der Bezeichnung <strong>Umzugsnetz</strong> betrieben. Soweit zusätzliche gesetzliche
                Pflichtangaben im Einzelfall bestehen sollten, etwa eine Umsatzsteuer-Identifikationsnummer, eine
                Wirtschafts-Identifikationsnummer oder registerrechtliche Angaben, sind diese nur anzugeben, sofern sie
                tatsächlich vorhanden sind.
              </p>
            </section>

            <section className="pt-8 border-t border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Verbraucherstreitbeilegung</h2>
              <p className="mb-4">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue hover:underline ml-1"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p>
                Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <SiteFooter theme="blue" />
    </div>
  );
}
