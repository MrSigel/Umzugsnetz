'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
Send, Link2, MessageCircle, Building2, Users, X, Info, ChevronRight, CheckCircle2, MapPin, ArrowRight, Star, FileText, Inbox, HeartHandshake, ShieldCheck, Network, Mail, Check, Calculator, Trash2, Award, BadgeCheck, ClipboardSignature, Mails, Truck, Phone, Plus
} from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import KostenrechnerWidget from '@/components/KostenrechnerWidget';
import { SiteHeader, SiteFooter } from '@/components/SiteLayout';
import { useToast } from '@/components/ToastProvider';
const Facebook = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
const XIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 4 16 16"/><path d="M20 4 4 20"/></svg>;
const Instagram = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
const TikTok = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.78h-3.13v13.18a2.72 2.72 0 1 1-2.72-2.72c.25 0 .5.04.72.1V9.28a5.85 5.85 0 1 0 5.85 5.85V8.54a7.93 7.93 0 0 0 4.63 1.48V6.89c-.54 0-1.07-.07-1.58-.2Z"/></svg>;

  // Animation für die Checkliste (Container)
  const listContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15 // Verzögerung zwischen jedem Haken
      }
    }
  };

  const calcButtonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.03 },
    tap: { scale: 0.98 },
  };

  const calcSheenVariants = {
    rest: { x: '-120%', opacity: 0 },
    hover: { x: '120%', opacity: 0.9 },
  };

export default function Landingpage() {
  const { showToast } = useToast();
  const scrollTo = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.preventDefault();
    if (id === '') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(id);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    }
  };

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  // HIER MUSS SIE HIN:
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  // Animation für jeden einzelnen Haken
  const listItem: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

const handleCopyEmail = () => {
  navigator.clipboard.writeText('kontakt@umzugsnetz.de');
  setCopyStatus('copied');
  // Nach 2 Sekunden wieder zurücksetzen
setTimeout(() => setCopyStatus('idle'), 2000);
};
  const socialLinks = {
    facebook: 'https://facebook.com/umzugsnetz',
    x: 'https://x.com/umzugsnetz',
    instagram: 'https://instagram.com/umzugsnetz',
    tiktok: 'https://www.tiktok.com/@umzugsnetz',
    whatsapp: 'https://wa.me/491722699945',
  } as const;

  const handleShare = async (channel: 'facebook' | 'x' | 'whatsapp' | 'instagram' | 'tiktok' | 'email' | 'copy') => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://umzugsnetz.de';

    if (channel === 'copy') {
      await navigator.clipboard.writeText(shareUrl);
      showToast('success', 'Link kopiert', 'Die Seiten-URL liegt jetzt in der Zwischenablage.');
      return;
    }

    if (channel === 'facebook' || channel === 'x' || channel === 'whatsapp' || channel === 'instagram' || channel === 'tiktok') {
      window.open(socialLinks[channel], '_blank', 'noopener,noreferrer');
      return;
    }

    if (channel === 'email') {
      window.location.href = 'mailto:?subject=' + encodeURIComponent('Umzugsnetz empfehlen') + '&body=' + encodeURIComponent('Besuchen Sie Umzugsnetz:\n\n' + shareUrl);
    }
  };
  const [wohnflaeche, setWohnflaeche] = useState<number>(60);
  const [entfernung, setEntfernung] = useState<number>(50);

  const estimatedPrice = (wohnflaeche * 5.5 + entfernung * 1.2).toFixed(2);


  const fadeIn: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* --- NEUE NAVIGATION START --- */}
      
      {/* --- NEUE NAVIGATION START --- */}
      <SiteHeader activeNav="startseite" theme="blue" />
      {/* --- NEUE NAVIGATION ENDE --- */}


{/* HERO SECTION - NACH NEUEM LAYOUT */}
      <section className="relative pt-8 pb-24 lg:pt-12 lg:pb-32 overflow-hidden">
        
        {/* Hintergrundbild (.png) */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero-umzugsboxen.png" 
            alt="Umzugskartons Hintergrund" 
            className="w-full h-full object-cover object-center"
          />
          {/* Ein sanfter weißer Verlauf */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/20"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* TRUST BADGES (Komplett mittig zentriert) */}
          <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.1 }}
             className="w-full flex flex-wrap items-center justify-center gap-4 mb-10 md:mb-14"
          >
            {/* Badge 1 */}
            <motion.div 
              whileHover={{ y: -3, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }}
              className="bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-full border border-brand-blue/20 flex items-center gap-2 cursor-default transition-colors shadow-sm"
            >
              <Award className="w-5 h-5 text-brand-blue" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Bester Service</span>
            </motion.div>

            {/* Badge 2 */}
            <motion.div 
              whileHover={{ y: -3, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }}
              className="bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-full border border-brand-blue/20 flex items-center gap-2 cursor-default transition-colors shadow-sm"
            >
              <ShieldCheck className="w-5 h-5 text-brand-blue" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">100% Sicher</span>
            </motion.div>

            {/* Badge 3 */}
            <motion.div 
              whileHover={{ y: -3, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }}
              className="bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-full border border-brand-blue/20 flex items-center gap-2 cursor-default transition-colors shadow-sm"
            >
              <BadgeCheck className="w-5 h-5 text-brand-blue" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Geprüfte Firmen</span>
            </motion.div>
          </motion.div>


          {/* 1. TITEL */}
          <motion.div 
            initial="hidden" animate="visible" variants={fadeIn}
            className="mb-12 md:mb-16 max-w-5xl"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-[#1e293b] leading-[1.2] tracking-tight">
              In unter 2 Minuten Angebote für <br />
              
              <span className="inline-block transition-all duration-300 hover:scale-105 hover:drop-shadow-md cursor-default origin-left">
                 <span className="text-brand-blue">Umzug</span> & <span className="text-[#00b67a]">Entrümpelung</span>
              </span> <br />
              
              vergleichen und sparen.
            </h1>
          </motion.div>

          {/* 2. UNTERER BEREICH (2 Spalten) */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* LINKE SPALTE */}
            <motion.div 
              initial="hidden" animate="visible" variants={fadeIn}
              className="flex flex-col gap-10"
            >
              {/* SLOGAN */}
              <div>
                <p className="text-lg md:text-xl text-slate-800 font-medium mb-3 leading-relaxed max-w-xl">
                  Vergleichen Sie kostenlos Angebote geprüfter Umzugs- und Entrümpelungsunternehmen aus Ihrer Region.
                </p>
                <p className="text-md font-bold text-brand-blue">
                  Über 6.000 Anfragen deutschlandweit über unsere Plattform
                </p>
              </div>

              {/* TRUSTPILOT */}
                <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
                  <div className="flex -space-x-3">
                  <Image className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-sm relative z-[1]" src="/1.jpeg" width={44} height={44} alt="Trustpilot Bewertung 1" sizes="44px" />
                  <Image className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-sm relative z-[2]" src="/2.jpeg" width={44} height={44} alt="Trustpilot Bewertung 2" sizes="44px" />
                  <Image className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-sm relative z-[3]" src="/3.jpeg" width={44} height={44} alt="Trustpilot Bewertung 3" sizes="44px" />
                  <Image className="hidden sm:block w-11 h-11 rounded-full border-2 border-white object-cover shadow-sm relative z-[4]" src="/4.jpeg" width={44} height={44} alt="Trustpilot Bewertung 4" sizes="44px" />
                    <div className="w-11 h-11 rounded-full border-2 border-white bg-brand-blue text-white flex items-center justify-center shadow-sm relative z-[5]">
                      <div className="w-7 h-7 rounded-full bg-white/12 flex items-center justify-center">
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                
                <a 
                  href="https://de.trustpilot.com/review/umzugsnetz.de" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex flex-col justify-center hover:opacity-80 transition-opacity"
                  title="Zu unseren Bewertungen auf Trustpilot"
                >
                  <img src="/IconTOP.png" alt="Trustpilot Sterne" className="mb-1 h-5 w-auto object-contain rendering-pixelated" style={{ imageRendering: 'auto' }} />
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-extrabold text-slate-900 uppercase tracking-wide">Ausgezeichnet</span>
                    <span className="font-bold text-slate-500 uppercase tracking-wide">4.9/5 auf Trustpilot</span>
                  </div>
                </a>
              </div>

              {/* ACTION BEREICH: Haupt-Button + 2 Sub-Buttons */}
              <div className="flex flex-col gap-3 w-full sm:w-max">
                
                {/* HAUPT BUTTON */}
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => scrollTo(e as any, 'rechner')}
                  className="w-full bg-brand-blue text-white px-8 md:px-12 py-4 rounded-full font-extrabold text-lg shadow-xl hover:bg-brand-blue-hover transition-colors flex items-center justify-center gap-3"
                >
                  Jetzt kostenlos anfragen <ChevronRight className="w-6 h-6" />
                </motion.button>

                {/* SEKUNDÄRE BUTTONS */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  
                  {/* Sub-Button 1: Umzugskosten */}
                  <motion.button 
                    variants={calcButtonVariants}
                    initial="rest"
                    animate="rest"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={(e) => {
                      scrollTo(e as any, 'rechner');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('openRechner', { detail: { service: 'privatumzug' } })), 400);
                    }}
                    className="group relative overflow-hidden flex items-center justify-center gap-1.5 border border-brand-blue/30 bg-white/55 backdrop-blur-md rounded-full py-2.5 px-2 transition-[color,background-color,border-color,box-shadow] shadow-sm hover:border-brand-blue/45 hover:bg-white/72 hover:shadow-lg"
                  >
                    <motion.span
                      aria-hidden="true"
                      variants={calcSheenVariants}
                      transition={{ duration: 0.75, ease: 'easeInOut' }}
                      className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                    />
                    <Calculator className="w-3.5 h-3.5 text-brand-blue flex-shrink-0 transition-colors" />
                    <span className="text-[10px] md:text-[11px] font-bold text-brand-blue leading-tight text-center transition-colors">
                      Umzugskosten<br/>berechnen
                    </span>
                  </motion.button>
                  
                  {/* Sub-Button 2: Entrümpelungskosten */}
                  <motion.button
                    variants={calcButtonVariants}
                    initial="rest"
                    animate="rest"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={(e) => {
                      scrollTo(e as any, 'rechner');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('openRechner', { detail: { service: 'entruempelung' } })), 400);
                    }}
                    className="group relative overflow-hidden flex items-center justify-center gap-1.5 border border-[#00b67a]/35 bg-white/55 backdrop-blur-md rounded-full py-2.5 px-2 transition-[color,background-color,border-color,box-shadow] shadow-sm hover:border-[#00b67a]/50 hover:bg-white/72 hover:shadow-lg"
                  >
                    <motion.span
                      aria-hidden="true"
                      variants={calcSheenVariants}
                      transition={{ duration: 0.75, ease: 'easeInOut' }}
                      className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                    />
                    <Trash2 className="w-3.5 h-3.5 text-[#00b67a] flex-shrink-0 transition-colors" />
                    <span className="text-[10px] md:text-[11px] font-bold text-[#008b60] leading-tight text-center transition-colors">
                      Entrümpelungskosten<br/>berechnen
                    </span>
                  </motion.button>

                </div>
              </div>

            </motion.div>

            {/* RECHTE SPALTE (Checkliste) */}
            <div className="lg:pl-10 mt-8 lg:mt-0">
              <motion.div 
                variants={listContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6 pt-4"
              >
                {[
                  '100% kostenlos & unverbindlich', 
                  'Anfrage in unter 2 Minuten', 
                  'Nur geprüfte Fachpartner', 
                  'Regionale Firmen aus Ihrer Nähe', 
                  'Keine versteckten Kosten'
                ].map((item, idx) => (
                  <motion.div key={idx} variants={listItem} className="flex items-center gap-4 group">
                    <div className="bg-[#00b67a]/10 group-hover:bg-[#00b67a] transition-colors p-2 rounded-full text-[#00b67a] group-hover:text-white flex-shrink-0 shadow-sm">
                      <Check className="w-5 h-5" strokeWidth={3} />
                    </div>
                    <span className="text-slate-900 font-bold text-[17px]">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Kostenlos & unverbindlich</p>
            <p className="truncate text-sm font-bold text-slate-900">Jetzt passende Umzugs- oder Entrümpelungsangebote anfragen</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={(e) => scrollTo(e as any, 'rechner')}
            className="pointer-events-auto flex-shrink-0 rounded-full bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/20"
          >
            Rechner öffnen
          </motion.button>
        </div>
      </div>

      {/* {/* WIE ES FUNKTIONIERT - PREMIUM UPDATE */}
      <section id="funktion" className="py-24 lg:py-32 bg-slate-50 relative overflow-hidden">
        
        {/* Dekorative Hintergrund-Elemente (weiche Farbkleckse) */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-blue/15 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Titel Bereich */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue-soft border border-brand-blue/20 text-brand-blue font-bold text-sm mb-6 shadow-sm">
              <Star className="w-4 h-4 fill-current" /> Einfach, schnell & sicher
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#1e293b] tracking-tight mb-6">
              Ihr Umzug in nur <span className="text-brand-blue">3 einfachen Schritten</span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Sparen Sie sich stundenlange Recherche. Teilen Sie uns Ihre Eckdaten mit und wir übernehmen den Rest – komplett kostenlos.
            </p>
          </motion.div>

          {/* Steps Grid mit Verbindungslinie */}
          <div className="relative">
            
            {/* Gestrichelte Verbindungslinie im Hintergrund (Nur Desktop) */}
            <div className="hidden lg:block absolute top-[45%] left-[10%] right-[10%] h-0.5 border-t-2 border-dashed border-slate-300 -z-10"></div>

            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              
              {/* Schritt 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: 0.1 }}
                className="group relative bg-white p-8 md:p-10 rounded-[2rem] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 flex flex-col items-center text-center"
              >
                {/* Badge "Schritt 1" */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest shadow-md">
                  Schritt 1
                </div>
                
                {/* Icon Container */}
                <div className="w-20 h-20 bg-brand-blue-soft group-hover:bg-brand-blue transition-colors duration-300 rounded-2xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 shadow-inner">
                  <ClipboardSignature className="w-10 h-10 text-brand-blue group-hover:text-white transition-colors duration-300" />
                </div>
                
                <h3 className="text-2xl font-extrabold text-slate-800 mb-4">Anfrage stellen</h3>
                <p className="text-slate-600 leading-relaxed">
                  Füllen Sie unser kurzes Formular in unter 2 Minuten aus. Geben Sie an, was transportiert oder entrümpelt werden soll.
                </p>
              </motion.div>

              {/* Schritt 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: 0.3 }}
                className="group relative bg-white p-8 md:p-10 rounded-[2rem] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 flex flex-col items-center text-center"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest shadow-md">
                  Schritt 2
                </div>
                <div className="w-20 h-20 bg-emerald-50 group-hover:bg-[#00b67a] transition-colors duration-300 rounded-2xl flex items-center justify-center mb-8 -rotate-3 group-hover:rotate-0 shadow-inner">
                  <Mails className="w-10 h-10 text-[#00b67a] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 mb-4">Angebote erhalten</h3>
                <p className="text-slate-600 leading-relaxed">
                  Wir leiten Ihre Anfrage an unser geprüftes Netzwerk weiter. Sie erhalten zeitnah unverbindliche Angebote.
                </p>
              </motion.div>

              {/* Schritt 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: 0.5 }}
                className="group relative bg-white p-8 md:p-10 rounded-[2rem] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 flex flex-col items-center text-center"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-blue text-white px-5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest shadow-md">
                  Schritt 3
                </div>
                <div className="w-20 h-20 bg-brand-blue-soft group-hover:bg-brand-blue transition-colors duration-300 rounded-2xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 shadow-inner">
                  <Truck className="w-10 h-10 text-brand-blue group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 mb-4">Vergleichen & Buchen</h3>
                <p className="text-slate-600 leading-relaxed">
                  Wählen Sie entspannt das beste Angebot aus. Sparen Sie Geld und genießen Sie einen stressfreien Service.
                </p>
              </motion.div>

            </div>
          </div>
          
          {/* Optionaler Call-to-Action unter den Schritten */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-16 text-center"
          >
            <a href="#rechner" onClick={(e) => scrollTo(e, 'rechner')} className="inline-flex items-center justify-center gap-2 text-brand-blue font-bold hover:text-brand-blue-hover transition-colors group">
              Direkt zum Kostenrechner <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>

        </div>
      </section>

{/* KOSTENRECHNER - VISUELL VERBESSERT */}
      <section id="rechner" className="py-24 bg-white relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              Umzugskosten <span className="text-brand-blue">sofort schätzen</span>
            </h2>
            <p className="text-slate-600">Nutzen Sie unseren Schieberegler, um einen ersten Richtwert zu erhalten.</p>
          </div>
          <KostenrechnerWidget />
        </div>
      </section>
{/* PARTNER BEREICH (B2B) */}
  <section id="partner" className="bg-brand-blue py-16 lg:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            
            {/* TEXT BEREICH */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl min-w-0 text-center lg:text-left"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6 break-words hyphens-auto">
                Sind Sie ein Umzugs- oder <br className="hidden md:block" />
                Entrümpelungsunternehmen?
              </h2>
              <p className="text-white/90 text-lg md:text-xl font-medium leading-relaxed opacity-90 break-words hyphens-auto">
                Werden Sie Teil unseres Premium-Netzwerks von über 500 geprüften Partnern und erhalten Sie hochwertige Anfragen direkt in Ihr Postfach.
              </p>
            </motion.div>

            {/* BUTTON BEREICH */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Button Umzugsunternehmen – Blau */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
              <Link href="/partner/umzug" className="w-full">
                <motion.div
                  whileHover={{ y: -5, scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:min-w-[240px] bg-white/15 hover:bg-white/25 border-2 border-white/30 hover:border-white/60 text-white px-8 py-6 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-sm text-center"
                >
                  <Truck className="w-7 h-7 mb-1 opacity-90" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-70">Für</span>
                  <span className="text-lg font-black leading-tight">Umzugsunternehmen</span>
                  <span className="text-xs text-white/60 flex items-center gap-1 mt-1">Jetzt bewerben <ArrowRight className="w-3 h-3" /></span>
                </motion.div>
              </Link>

              {/* Button Entrümpelungsfirmen – Grün */}
              <Link href="/partner/entruempelung" className="w-full">
                <motion.div
                  whileHover={{ y: -5, scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:min-w-[240px] bg-[#00b67a]/30 hover:bg-[#00b67a]/50 border-2 border-[#00ff9d]/30 hover:border-[#00ff9d]/60 text-white px-8 py-6 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-sm text-center"
                >
                  <Trash2 className="w-7 h-7 mb-1 opacity-90" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-70">Für</span>
                  <span className="text-lg font-black leading-tight">Entrümpelungsfirmen</span>
                  <span className="text-xs text-white/60 flex items-center gap-1 mt-1">Jetzt bewerben <ArrowRight className="w-3 h-3" /></span>
                </motion.div>
              </Link>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

{/* VERTRAUENS-ABSCHNITT (EXPERTS & TRUST) */}
      <section className="py-24 lg:py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            
            {/* LINKE SPALTE: CONTENT */}
            <motion.div 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-7"
            >
              {/* Kleiner Badge oben */}
              <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-brand-blue-soft border border-brand-blue/20">
                <span className="text-xs font-bold text-brand-blue uppercase tracking-widest">Sicherheit & Vertrauen</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#1e293b] leading-tight mb-8">
                Warum Experten und Kunden auf uns vertrauen
              </h2>
              
              <p className="text-lg text-slate-600 mb-12 max-w-2xl leading-relaxed">
                Wir sind Ihr zuverlässiger Partner für den Umzug. Wir setzen auf höchste Qualität, absolute Transparenz und ausschließlich geprüfte Fachbetriebe aus Ihrer Region.
              </p>

              {/* USP Liste */}
              <div className="space-y-10">
                {[
                  {
                    title: "Netzwerk von Fachunternehmen",
                    desc: "Wir arbeiten ausschließlich mit Umzugs- und Entrümpelungsunternehmen zusammen, die über alle notwendigen Gewerbeanmeldungen und umfassenden Versicherungsschutz verfügen."
                  },
                  {
                    title: "Datenschutz nach DSGVO",
                    desc: "Ihre Daten sind bei uns sicher. Sie werden streng vertraulich behandelt und ausschließlich zur Bearbeitung Ihrer individuellen Anfrage an passende Partner weitergeleitet."
                  },
                  {
                    title: "Einfacher Angebotsvergleich",
                    desc: "Kein langes Suchen. Mit nur einer Anfrage erhalten Sie maßgeschneiderte Angebote, die Sie transparent und unkompliziert miteinander vergleichen können."
                  }
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.2 }}
                    className="flex gap-6 group"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-brand-blue-soft flex items-center justify-center text-brand-blue shadow-sm group-hover:bg-brand-blue group-hover:text-white transition-all duration-300">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
                      <p className="text-slate-600 leading-relaxed text-sm md:text-base">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* RECHTE SPALTE: FLOATING CTA CARD */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 relative"
            >
              {/* Dekorativer Hintergrund-Shape */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-brand-blue/15 to-emerald-100 rounded-[3rem] blur-2xl opacity-40 -z-10"></div>
              
              <div className="bg-white p-1 md:p-2 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-50 px-8 py-12 text-center">
                  
                  {/* Icon Badge */}
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-8">
                    <div className="w-12 h-12 bg-brand-blue rounded-xl flex items-center justify-center text-white">
                      <MapPin className="w-6 h-6" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-4">Bereit für Ihren Umzug?</h3>
                  <p className="text-slate-600 mb-10 leading-relaxed">
                    Vergleichen Sie jetzt kostenlos Angebote von Top-Umzugsunternehmen aus Ihrer Region und sparen Sie wertvolle Zeit bei der Suche.
                  </p>
                  
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(16 185 129 / 0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => scrollTo(e as any, 'rechner')}
                    className="w-full bg-gradient-to-r from-[#00b67a] to-[#10b981] text-white py-5 rounded-2xl font-extrabold text-lg shadow-xl transition-all flex items-center justify-center gap-3"
                  >
                    Jetzt kostenlos anfragen <ArrowRight className="w-5 h-5" />
                  </motion.button>
                  
                  <p className="mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    100% Kostenlos & Unverbindlich
                  </p>
                </div>
              </div>

              {/* Floating Element: Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-50 hidden md:flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="pr-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Geprüfte Qualität</div>
                  <div className="text-sm font-black text-slate-800">TÜV-zertifiziert</div>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

{/* FAQ ABSCHNITT - FIX VERSION */}
<section id="faq" className="py-24 bg-slate-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex flex-col lg:flex-row gap-16">
      
      {/* LINKS: Titel & Support */}
      <div className="lg:w-1/3">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-brand-blue/10 border border-brand-blue/25 text-brand-blue text-xs font-bold uppercase tracking-widest">
          Fragen & Antworten
        </div>
        <h2 className="text-4xl font-black text-[#1e293b] leading-tight mb-6">
          Häufig gestellte <br/><span className="text-brand-blue">Fragen</span>
        </h2>
        <p className="text-slate-600 mb-10">
          Noch Zweifel? Hier finden Sie schnelle Antworten auf die wichtigsten Fragen zu unserem Service.
        </p>

        <div className="bg-brand-blue p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8"></div>
          <div className="relative z-10 text-white">
            <h4 className="text-xl font-bold mb-2">Noch Fragen?</h4>
            <p className="text-white/80 text-sm mb-8">
              Unser Support-Team ist werktags von 09:00 bis 18:00 Uhr persönlich für Sie da.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openChat'))}
              className="w-full bg-white text-brand-blue py-4 rounded-2xl font-bold text-sm hover:bg-brand-blue/10 transition-colors uppercase cursor-pointer"
            >
              Support kontaktieren
            </button>
          </div>
        </div>
      </div>

      {/* RECHTS: Die Accordions */}
      <div className="lg:w-2/3 space-y-4">
        {[
          { 
            id: 1, 
            q: "Wie genau funktioniert der Vergleich?", 
            a: "Nachdem Sie Ihre Eckdaten eingegeben haben, filtert unser System passende Partner aus Ihrem Umkreis. Sie erhalten unverbindliche Angebote direkt per Mail." 
          },
          { 
            id: 2, 
            q: "Ist der Service wirklich kostenlos?", 
            a: "Ja, zu 100%. Wir finanzieren uns über unsere Partnerunternehmen. Für Sie entstehen keine Kosten oder Verpflichtungen." 
          },
          { 
            id: 3, 
            q: "Wie werden die Partnerunternehmen geprüft?", 
            a: "Wir fordern von jedem Partner gültige Gewerbenachweise und Versicherungsbelege an, um höchste Qualität zu garantieren." 
          },
          { 
            id: 4, 
            q: "Muss ich ein Angebot annehmen?", 
            a: "Nein. Wenn Ihnen kein Angebot zusagt, können Sie den Vorgang jederzeit ohne Angabe von Gründen beenden." 
          },
          { 
            id: 5, 
            q: "Wie schnell erhalte ich die Angebote?", 
            a: "In der Regel erhalten Sie erste Rückmeldungen bereits innerhalb weniger Stunden nach Absenden Ihrer Anfrage." 
          }
        ].map((item) => {
          const isOpen = activeFaq === item.id;

          return (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:border-brand-blue/30">
              <button 
                onClick={() => setActiveFaq(isOpen ? null : item.id)}
                className="w-full p-6 text-left flex justify-between items-center gap-4 focus:outline-none"
              >
                <span className={`font-bold text-lg transition-colors ${isOpen ? 'text-brand-blue' : 'text-slate-800'}`}>
                  {item.q}
                </span>
                <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-blue' : 'text-slate-400'}`} />
              </button>
              
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-slate-600 leading-relaxed pt-2 border-t border-slate-50">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

    </div>
  </div>
</section>

{/* RATGEBER / EXPERTEN-WISSEN */}
      <section id="ratgeber" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header-Bereich */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-brand-blue-soft border border-brand-blue/20 text-brand-blue text-xs font-bold uppercase tracking-widest">
                Ratgeber
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-[#1e293b] leading-tight mb-4">
                Wissen für Ihren <span className="text-brand-blue">Umzug</span>
              </h2>
              <p className="text-lg text-slate-600">
                Profitieren Sie von unseren Experten-Tipps für eine stressfreie Planung und Durchführung Ihres Vorhabens.
              </p>
            </motion.div>
            

          </div>

          {/* Artikel Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {[
              {
                slug: "umzug-planen",
                tag: "Planung",
                title: "Umzug planen: In 10 Schritten zum stressfreien Wechsel",
                desc: "Erfahren Sie, wie Sie Ihren Umzug perfekt planen. Von Zeitmanagement bis hin zu den besten Insider-Tipps.",
                img: "/umzug_planen.png",
                color: "blue"
              },
              {
                slug: "umzug-checkliste",
                tag: "Planung",
                title: "Die ultimative Umzug-Checkliste (PDF & Online)",
                desc: "Verpassen Sie nichts mit unserer umfassenden Umzug-Checkliste. Alle Aufgaben chronologisch sortiert.",
                img: "/umzug_checkliste.png",
                color: "emerald"
              },
              {
                slug: "umzugskosten-berechnen",
                tag: "Finanzen",
                title: "Umzugskosten berechnen: Was kostet es wirklich?",
                desc: "Transparente Übersicht über alle Kostenfaktoren. Erfahren Sie, wie sich Preise zusammensetzen.",
                img: "/umzugskosten_berechnen.jpg",
                color: "amber"
              }
            ].map((article, idx) => (
              <Link href={`/ratgeber/${article.slug}`} key={idx}>
                <motion.article 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group cursor-pointer block h-full"
                >
                  {/* Bild-Container */}
                  <div className="relative h-64 mb-6 overflow-hidden rounded-[2rem] shadow-lg">
                    <img 
                      src={article.img} 
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Overlay bei Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
                      <span className="text-white font-bold flex items-center gap-2">
                        Jetzt lesen <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                    {/* Kategorie Badge */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-sm">
                      {article.tag}
                    </div>
                  </div>

                  {/* Text-Inhalt */}
                  <div className="px-2">
                    <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-brand-blue transition-colors leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2">
                      {article.desc}
                    </p>
                    <div className="flex items-center gap-2 text-brand-blue text-sm font-bold uppercase tracking-wider">
                      Weiterlesen <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.article>
              </Link>
            ))}
          </div>
        </div>
      </section>

{/* FINAL CALL TO ACTION & SHARE */}
      <section className="py-24 lg:py-32 bg-slate-50 relative overflow-hidden">
        {/* Dekorative Hintergrund-Elemente für Tiefe */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1e293b] leading-tight mb-8">
              Bereit für einen <br />
              <span className="text-brand-blue">stressfreien Umzug?</span>
            </h2>
            
            <p className="text-lg md:text-xl text-slate-600 mb-12 leading-relaxed max-w-2xl mx-auto">
              Vergleichen Sie jetzt kostenlos Angebote von geprüften Firmen und sparen Sie bares Geld. Werden Sie einer von tausenden zufriedenen Kunden.
            </p>

            {/* Haupt-Button mit Glow-Effekt */}
            <div className="mb-20">
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 20px 30px -10px rgb(0 182 122 / 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => scrollTo(e as any, 'rechner')}
                className="bg-[#00b67a] text-white px-10 py-5 rounded-2xl font-black text-xl shadow-xl transition-all flex items-center justify-center gap-3 mx-auto"
              >
                Jetzt kostenlos anfragen <ChevronRight className="w-6 h-6" />
              </motion.button>
              <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">
                Dauert weniger als 2 Minuten
              </p>
            </div>

            {/* Weiterempfehlen Bereich */}
            <div className="pt-16 border-t border-slate-200">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8">
                Umzugsnetz weiterempfehlen
              </h3>
              
              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { icon: Facebook, label: "Facebook", action: 'facebook', color: "hover:text-[#1877F2] hover:bg-[#1877F2]/10" },
                  { icon: XIcon, label: "X", action: 'x', color: "hover:text-black hover:bg-black/5" },
                  { icon: MessageCircle, label: "WhatsApp", action: 'whatsapp', color: "hover:text-[#25D366] hover:bg-[#25D366]/10" },
                  { icon: Instagram, label: "Instagram", action: 'instagram', color: "hover:text-[#E4405F] hover:bg-[#E4405F]/10" },
                  { icon: TikTok, label: "TikTok", action: 'tiktok', color: "hover:text-black hover:bg-black/5" },
                  { icon: Send, label: "E-Mail", action: 'email', color: "hover:text-brand-blue hover:bg-brand-blue/10" },
                  { icon: Link2, label: "Link kopieren", action: 'copy', color: "hover:text-slate-900 hover:bg-slate-200" }
                ].map((social, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleShare(social.action as 'facebook' | 'x' | 'whatsapp' | 'instagram' | 'tiktok' | 'email' | 'copy')}
                    className={`w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 transition-all duration-300 ${social.color}`}
                    title={social.label}
                  >
                    <social.icon className="w-6 h-6" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <SiteFooter theme="blue" />

    </div>
  );
}
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
      <div 
        className={`bg-white rounded-2xl border transition-all duration-300 ${
        isOpen ? 'border-brand-blue/30 shadow-xl' : 'border-slate-200 hover:border-brand-blue/30 shadow-sm'
      }`}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex justify-between items-center gap-4 focus:outline-none"
      >
        <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-brand-blue' : 'text-slate-800'}`}>
          {question}
        </span>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'rotate-180 bg-brand-blue text-white' : 'bg-slate-100 text-slate-400'
        }`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-50 pt-4">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

