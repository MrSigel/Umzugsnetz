'use client';

import React from 'react';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { motion } from 'framer-motion';
import { FileCheck, Gavel, Scale } from 'lucide-react';

export default function AGBPage() {
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
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800">
              <Scale className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-slate-900">Allgemeine Geschäftsbedingungen</h1>
          </div>

          <div className="space-y-10 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <Gavel className="w-5 h-5 text-brand-blue" />
                § 1 Geltungsbereich
              </h2>
              <p>
                Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Website und der darüber bereitgestellten
                Vermittlungsleistungen von <strong>Umzugsnetz</strong>, betrieben von Dean Zander.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-brand-blue" />
                § 2 Leistungsbeschreibung
              </h2>
              <p>
                Umzugsnetz stellt eine Vermittlungsplattform für Umzugs- und Entrümpelungsanfragen bereit. Über die Website
                können Nutzer Anfragen einstellen und passende Partnerunternehmen können kostenpflichtige Leads erwerben.
              </p>
              <p>
                Umzugsnetz wird ausschließlich als Vermittler tätig. Ein Vertrag über die eigentliche Umzugs- oder
                Entrümpelungsleistung kommt ausschließlich zwischen dem anfragenden Kunden und dem jeweiligen
                Partnerunternehmen zustande.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">§ 3 Kostenfreiheit für Endkunden</h2>
              <p>
                Für Endkunden ist die Nutzung der Anfrage- und Vergleichsfunktionen grundsätzlich kostenlos und
                unverbindlich.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">§ 4 Pflichten der Nutzer</h2>
              <p>
                Nutzer sind verpflichtet, sämtliche Angaben wahrheitsgemäß und vollständig zu machen und die Plattform nicht
                missbräuchlich zu verwenden. Insbesondere sind unzutreffende, irreführende oder missbräuchliche Anfragen
                unzulässig.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">§ 5 Haftung</h2>
              <p>
                Umzugsnetz haftet nach den gesetzlichen Vorschriften bei Vorsatz und grober Fahrlässigkeit. Bei einfacher
                Fahrlässigkeit haftet Umzugsnetz nur bei Verletzung wesentlicher Vertragspflichten
                (Kardinalpflichten) und beschränkt auf den vorhersehbaren, vertragstypischen Schaden.
              </p>
              <p>
                Für die Leistungen, Preise, Zusagen und Inhalte der Partnerunternehmen übernimmt Umzugsnetz keine Gewähr,
                da diese Leistungen nicht von Umzugsnetz selbst erbracht werden.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">§ 6 Vertragsschluss mit Partnerunternehmen</h2>
              <p>
                Ein möglicher Vertrag über die Durchführung eines Umzugs oder einer Entrümpelung kommt ausschließlich
                zwischen dem Kunden und dem ausgewählten Partnerunternehmen zustande. Umzugsnetz wird nicht Vertragspartei
                dieser Leistung.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">§ 7 Schlussbestimmungen</h2>
              <p>
                Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts, soweit dem keine
                zwingenden Verbraucherschutzvorschriften entgegenstehen.
              </p>
              <p>
                Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die
                Wirksamkeit der übrigen Bestimmungen unberührt.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <SiteFooter theme="blue" />
    </div>
  );
}
