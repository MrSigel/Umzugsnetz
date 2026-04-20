'use client';

import React from 'react';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { motion } from 'framer-motion';
import { Eye, Lock, ShieldCheck } from 'lucide-react';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <SiteHeader activeNav="none" theme="blue" />
      <main className="max-w-5xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-16">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-slate-900">Datenschutzerklärung</h1>
          </div>
          <div className="space-y-10 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3"><Lock className="w-6 h-6 text-brand-blue" />1. Verantwortlicher</h2>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                <p className="font-bold text-slate-800">Dean Zander</p>
                <p>Heinrich Pierson Straße 20</p>
                <p>E-Mail: kontakt@umzugsnetz.de</p>
                <p>Telefon: 01722699945</p>
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3"><Eye className="w-6 h-6 text-brand-blue" />2. Allgemeine Hinweise zur Datenverarbeitung</h2>
              <p>Personenbezogene Daten verarbeiten wir ausschließlich im Rahmen der gesetzlichen Vorgaben, insbesondere der Datenschutz-Grundverordnung (DSGVO), des Bundesdatenschutzgesetzes (BDSG) und – soweit einschlägig – des Telekommunikation-Digitale-Dienste-Datenschutz-Gesetzes (TDDDG).</p>
              <p>Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.</p>
            </section>
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">3. Hosting und technische Bereitstellung</h2>
              <p>Diese Website wird technisch über Hosting- und Infrastrukturleistungen bereitgestellt. Dabei können beim Aufruf der Website technisch erforderliche Server-Logdaten verarbeitet werden, insbesondere IP-Adresse, Datum und Uhrzeit des Zugriffs, abgerufene Inhalte, Browsertyp, Betriebssystem sowie Referrer-URL.</p>
            </section>
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">4. Kontaktaufnahme und Formulare</h2>
              <p>Wenn Sie uns per Kontaktformular, Partnerformular, Kostenrechner, Livechat oder E-Mail kontaktieren, verarbeiten wir die von Ihnen eingegebenen Daten zur Bearbeitung Ihrer Anfrage und für Anschlussfragen.</p>
            </section>
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">5. Vermittlung von Anfragen</h2>
              <p>Wenn Sie den Kostenrechner oder eine Anfragefunktion nutzen, können Ihre Daten an passende Partnerunternehmen weitergegeben werden, soweit dies zur Vermittlung Ihrer Anfrage erforderlich ist.</p>
            </section>
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">6. Partnerbereich und Nutzerkonten</h2>
              <p>Für den Partnerbereich werden Registrierungs-, Login- und Kontodaten verarbeitet. Dazu gehören insbesondere Stammdaten des Partnerunternehmens, Kontaktdaten, Login-Informationen, Guthaben- und Transaktionsdaten, Einstellungen sowie freigeschaltete Kundenanfragen.</p>
            </section>
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">7. Livechat</h2>
              <p>Wenn Sie den Livechat nutzen, verarbeiten wir die von Ihnen übermittelten Nachrichten, Ihren angegebenen Namen sowie technische Sitzungsdaten, um Ihre Support-Anfrage zu bearbeiten und den Chatverlauf bereitzustellen.</p>
            </section>
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">8. Zahlungs- und Guthabenanfragen</h2>
              <p>Sofern Partner Guthabenanfragen oder Zahlungsinformationen übermitteln, verarbeiten wir die hierfür erforderlichen Daten, insbesondere Referenzen, Beträge, Statusangaben und zugehörige Partnerdaten.</p>
            </section>
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-4">9. Speicherdauer</h2>
              <p>Personenbezogene Daten werden nur so lange gespeichert, wie dies für die jeweiligen Verarbeitungszwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.</p>
            </section>
          </div>
        </motion.div>
      </main>
      <SiteFooter theme="blue" />
    </div>
  );
}
