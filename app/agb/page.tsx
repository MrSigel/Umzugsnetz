'use client';

import React from 'react';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { motion } from 'framer-motion';
import { Gavel, FileCheck, AlertCircle, Scale } from 'lucide-react';

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
            <h1 className="text-4xl font-black text-[#1e293b]">Allgemeine Geschäftsbedingungen</h1>
          </div>

          <div className="space-y-10 text-slate-600 leading-relaxed">
            
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <Gavel className="w-5 h-5 text-[#00a8f3]" /> § 1 Geltungsbereich & Dienstleistung
              </h2>
              <p>
                Die Umzugsnetz Digital GmbH (nachfolgend „Betreiber“) betreibt ein Internetportal zur Vermittlung von Umzugs- und Entrümpelungsdienstleistungen. Der Betreiber tritt ausschließlich als Vermittler zwischen Kunden und Dienstleistern (Partnerunternehmen) auf. Ein Vertrag über die eigentliche Dienstleistung kommt ausschließlich zwischen dem Kunden und dem gewählten Partnerunternehmen zustande.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-[#00a8f3]" /> § 2 Kosten der Vermittlung
              </h2>
              <p>
                Die Nutzung des Portals und die Vermittlung von Anfragen sind für den Kunden vollständig kostenlos und unverbindlich. Die Partnerunternehmen zahlen dem Betreiber eine Gebühr für die Bereitstellung der Leads.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[#00a8f3]" /> § 3 Haftungsbeschränkung
              </h2>
              <p>
                Der Betreiber übernimmt keine Gewähr für die Richtigkeit der Angaben der Partnerunternehmen oder die Qualität der von diesen erbrachten Leistungen. Die Haftung des Betreibers ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Für Schäden, die aus dem Vertragsverhältnis zwischen Kunde und Partnerunternehmen entstehen, haftet der Betreiber nicht.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <Scale className="w-5 h-5 text-[#00a8f3]" /> § 4 Pflichten des Nutzers
              </h2>
              <p>
                Der Nutzer verpflichtet sich, im Kostenrechner ausschließlich wahrheitsgemäße Angaben zu machen. Die missbräuchliche Nutzung des Portals (z.B. Fake-Anfragen) ist untersagt und kann rechtliche Schritte nach sich ziehen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">§ 5 Widerrufsbelehrung</h2>
              <p>
                Da die Vermittlungsleistung des Betreibers für den Verbraucher kostenfrei ist und mit der Übermittlung der Anfrage an die Partnerunternehmen unmittelbar vollständig erbracht wird, erlischt ein etwaiges Widerrufsrecht mit dem Absenden der Anfrage.
              </p>
            </section>

            <section className="pt-8 border-t border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">§ 6 Schlussbestimmungen</h2>
              <p>
                Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist Berlin, sofern der Nutzer Kaufmann ist. Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Punkte unberührt.
              </p>
            </section>

          </div>
        </motion.div>
      </main>

      <SiteFooter theme="blue" />
    </div>
  );
}
