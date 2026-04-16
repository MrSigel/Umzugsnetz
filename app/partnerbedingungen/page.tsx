'use client';

import React from 'react';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle2, ShieldAlert, BadgeCheck } from 'lucide-react';

export default function PartnerbedingungenPage() {
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
              <Briefcase className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-[#1e293b]">Partnerbedingungen</h1>
          </div>

          <p className="text-lg text-slate-600 mb-12 italic">
            Diese Bedingungen gelten für alle gewerblichen Partner (Umzugs- und Entrümpelungsunternehmen), die über unser Portal Kundenanfragen beziehen möchten.
          </p>

          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-brand-blue" /> 1. Qualifikation & Prüfung
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Jeder Partner muss über die notwendigen Genehmigungen zur Ausübung seines Gewerbes verfügen. Dies beinhaltet insbesondere:
              </p>
              <ul className="space-y-3 pl-6">
                {[
                  'Gültige Gewerbeanmeldung',
                  'Betriebshaftpflichtversicherung (mind. 2 Mio. € Deckung)',
                  'Güterschadenhaftpflichtversicherung (für Umzugsunternehmen)',
                  'Entsorgungsfachkundenachweis (für Entrümpelungsfirmen)'
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-[#00b67a]" /> {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-blue" /> 2. Umgang mit Kundendaten
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Partner verpflichten sich, die übermittelten Kundenanfragen ausschließlich zum Zweck der Angebotserstellung für das konkrete Projekt zu nutzen. Eine Weitergabe der Daten an Dritte oder eine Nutzung für andere Werbezwecke ist ausdrücklich untersagt und führt zum sofortigen Ausschluss aus dem Netzwerk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-brand-blue" /> 3. Feedback & Qualität
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Der Betreiber führt regelmäßige Qualitätskontrollen durch. Erhält ein Partner wiederholt begründete negative Bewertungen durch Kunden, behält sich der Betreiber das Recht vor, die Partnerschaft einseitig zu beenden.
              </p>
            </section>

            <section className="pt-8 border-t border-slate-100 italic text-sm text-slate-400">
              Diese Bedingungen treten mit dem Absenden des Partner-Registrierungsformulars in Kraft.
            </section>
          </div>
        </motion.div>
      </main>

      <SiteFooter theme="blue" />
    </div>
  );
}
