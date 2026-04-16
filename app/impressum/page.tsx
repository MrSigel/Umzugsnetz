'use client';

import React from 'react';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { motion } from 'framer-motion';
import { FileText, MapPin, Mail, Phone, Building } from 'lucide-react';

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
            <h1 className="text-4xl font-black text-[#1e293b]">Impressum</h1>
          </div>

          <div className="space-y-12">
            {/* Betreiber */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-brand-blue" /> Angaben gemäß § 5 TMG
              </h2>
              <div className="text-slate-600 space-y-2 leading-relaxed pl-7">
                <p className="font-bold text-slate-800 text-lg">Umzugsnetz Digital GmbH</p>
                <p>Musterstraße 123</p>
                <p>10115 Berlin</p>
              </div>
            </section>

            {/* Vertretung */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" /> Vertreten durch
              </h2>
              <div className="text-slate-600 leading-relaxed pl-7">
                <p>Max Mustermann (Geschäftsführer)</p>
              </div>
            </section>

            {/* Kontakt */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-blue" /> Kontakt
              </h2>
              <div className="text-slate-600 space-y-3 leading-relaxed pl-7">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Telefon: +49 (0) 30 12345678</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>E-Mail: kontakt@umzugsnetz.de</span>
                </div>
              </div>
            </section>

            {/* Registereintrag */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-brand-blue" /> Registereintrag
              </h2>
              <div className="text-slate-600 space-y-2 leading-relaxed pl-7">
                <p>Eintragung im Handelsregister.</p>
                <p>Registergericht: Amtsgericht Charlottenburg (Berlin)</p>
                <p>Registernummer: HRB 123456 B</p>
              </div>
            </section>

            {/* Umsatzsteuer-ID */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" /> Umsatzsteuer-ID
              </h2>
              <div className="text-slate-600 leading-relaxed pl-7">
                <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:</p>
                <p className="font-medium text-slate-800">DE 123456789</p>
              </div>
            </section>

            {/* Streitbeilegung */}
            <section className="pt-8 border-t border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">EU-Streitbeilegung</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
                <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline ml-1">
                  https://ec.europa.eu/consumers/odr/
                </a>.
              </p>
              <h2 className="text-xl font-bold text-slate-800 mb-4">Verbraucherstreitbeilegung</h2>
              <p className="text-slate-600 leading-relaxed">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <SiteFooter theme="blue" />
    </div>
  );
}
