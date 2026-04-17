'use client';

import React from 'react';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { motion } from 'framer-motion';
import { Cookie, Settings2 } from 'lucide-react';

export default function CookiesPage() {
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
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Cookie className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-slate-900">Cookie-Richtlinie</h1>
          </div>

          <div className="space-y-10 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
                <Settings2 className="w-6 h-6 text-brand-blue" />
                1. Allgemeines
              </h2>
              <p>
                Auf dieser Website werden Cookies und vergleichbare Speichertechnologien eingesetzt, soweit dies für die
                technische Bereitstellung, Sicherheit, Darstellung und Einwilligungsverwaltung erforderlich ist.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">2. Technisch notwendige Cookies</h2>
              <p>
                Technisch notwendige Cookies und lokale Speicherungen sind erforderlich, damit die Website korrekt
                funktioniert. Dazu gehören insbesondere die Speicherung Ihrer Cookie-Einstellungen sowie technisch
                erforderliche Sitzungs- oder Komfortfunktionen.
              </p>
              <p>
                Rechtsgrundlage ist § 25 Abs. 2 TDDDG sowie Art. 6 Abs. 1 lit. f DSGVO.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">3. Analyse- und Marketing-Cookies</h2>
              <p>
                Analyse- und Marketing-Cookies dürfen nur gesetzt werden, wenn Sie zuvor ausdrücklich eingewilligt haben.
                Soweit solche Dienste auf dieser Website eingesetzt werden, erfolgt dies ausschließlich nach Ihrer
                Einwilligung.
              </p>
              <p>
                Rechtsgrundlage ist dann § 25 Abs. 1 TDDDG in Verbindung mit Art. 6 Abs. 1 lit. a DSGVO.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">4. Speicherdauer</h2>
              <p>
                Die Speicherdauer hängt vom jeweiligen Cookie oder Speichervorgang ab. Session-Cookies werden regelmäßig nach
                Ende Ihres Besuchs gelöscht. Gespeicherte Einwilligungspräferenzen bleiben gespeichert, bis Sie diese
                ändern oder löschen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">5. Verwaltung Ihrer Einstellungen</h2>
              <p>
                Sie können Ihre Cookie-Entscheidung über das Cookie-Banner treffen und bereits erteilte Einwilligungen mit
                Wirkung für die Zukunft widerrufen. Zudem können Sie in Ihrem Browser gespeicherte Cookies und lokale Daten
                löschen.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <SiteFooter theme="blue" />
    </div>
  );
}
