'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Network, Mail, MapPin, Phone, Menu, X, ChevronDown } from 'lucide-react';

const Facebook = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
const XIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 4 16 16"/><path d="M20 4 4 20"/></svg>;
const Instagram = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
const TikTok = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.78h-3.13v13.18a2.72 2.72 0 1 1-2.72-2.72c.25 0 .5.04.72.1V9.28a5.85 5.85 0 1 0 5.85 5.85V8.54a7.93 7.93 0 0 0 4.63 1.48V6.89c-.54 0-1.07-.07-1.58-.2Z"/></svg>;

export function SiteHeader({ activeNav = 'startseite', theme = 'blue' }: { activeNav?: string, theme?: 'blue' | 'green' }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const c_primary = theme === 'green' ? '#00b67a' : '#005ea6';
  const bg_class = theme === 'green' ? 'bg-brand-green' : 'bg-brand-blue';
  const text_hoverClass = theme === 'green' ? 'hover:text-brand-green' : 'hover:text-brand-blue';
  const text_activeClass = theme === 'green' ? 'text-brand-green' : 'text-brand-blue';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('kontakt@umzugsnetz.de');
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const navLinks = [
    { href: '/', label: 'Startseite', key: 'startseite' },
    { href: '/#rechner', label: 'Kostenrechner', key: 'rechner' },
    { href: '/#ratgeber', label: 'Ratgeber', key: 'ratgeber' },
    { href: '/partner', label: 'Für Partner', key: 'partner' },
  ];

  const socialLinks = [
    { label: 'Instagram', href: 'https://instagram.com/umzugsnetz', Icon: Instagram },
    { label: 'Facebook', href: 'https://facebook.com/umzugsnetz', Icon: Facebook },
    { label: 'X', href: 'https://x.com/umzugsnetz', Icon: XIcon },
    { label: 'TikTok', href: 'https://www.tiktok.com/@umzugsnetz', Icon: TikTok },
  ];

  return (
    <>
      <div className={`${bg_class} text-white py-2.5 hidden xl:block`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center text-sm font-semibold gap-6">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Ihre Anfrage ist kostenlos &amp; unverbindlich</span>
          </div>
          <div className="w-px h-4 bg-white/40 flex-shrink-0" />
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Network className="w-4 h-4 flex-shrink-0" />
            <span>Deutschlands Netzwerk für Umzug &amp; Entrümpelung</span>
          </div>
          <div className="w-px h-4 bg-white/40 flex-shrink-0" />
          <div className="relative group flex items-center">
            <button onClick={handleCopyEmail} className="flex items-center gap-2 whitespace-nowrap hover:text-white/90 transition-colors cursor-pointer focus:outline-none">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>kontakt@umzugsnetz.de</span>
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
              Klicke zum Kopieren
            </div>
            <AnimatePresence>
              {copyStatus === 'copied' && (
                <motion.div initial={{ opacity: 0, y: 10, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -10, x: '-50%' }}
                  className="absolute bottom-full mb-2 left-1/2 bg-emerald-500 text-white text-[11px] font-bold py-1 px-3 rounded shadow-lg z-[60]">
                  E-Mail kopiert!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <a href="https://de.trustpilot.com/review/umzugsnetz.de" target="_blank" rel="noopener noreferrer"
            className="flex items-center flex-shrink-0 ml-2 hover:opacity-80 transition-opacity">
            <img src="/IconTOP.png" alt="Trustpilot Bewertung" className="h-5.5 w-auto object-contain brightness-0 invert" />
          </a>
        </div>
      </div>

      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center flex-shrink-0">
            <motion.img whileHover={{ scale: 1.05 }} src="/logo_transparent.png" alt="Umzugsnetz Logo" className="h-12 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex gap-8 font-bold text-slate-600 items-center">
            {navLinks.map(({ href, label, key }) => (
              <Link key={key} href={href}
                className={`transition-colors ${activeNav === key ? text_activeClass : text_hoverClass}`}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/#rechner" className="hidden md:block">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ backgroundColor: c_primary }}
                className="text-white px-8 py-3 rounded-full font-bold shadow-md transition-colors hover:opacity-90">
                Kostenlos anfragen
              </motion.button>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={isMobileMenuOpen}
              className="md:hidden w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="fixed top-20 left-0 right-0 z-50 md:hidden"
              >
                <div className="mx-4 sm:mx-6 rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="p-4 space-y-2">
                    {navLinks.map(({ href, label, key }) => (
                      <Link
                        key={key}
                        href={href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block px-4 py-3 rounded-2xl font-bold transition-colors ${
                          activeNav === key ? 'bg-slate-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="mb-4 flex items-center justify-center gap-3 border-t border-slate-100 pt-4">
                      {socialLinks.map(({ label, href, Icon }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-100"
                          aria-label={label}
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      ))}
                    </div>
                    <Link href="/#rechner" onClick={() => setIsMobileMenuOpen(false)} className="block">
                      <button
                        type="button"
                        style={{ backgroundColor: c_primary }}
                        className="w-full text-white py-3.5 rounded-2xl font-black shadow-md hover:opacity-95 transition-opacity"
                      >
                        Kostenlos anfragen
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

export function SiteFooter({ theme = 'blue' }: { theme?: 'blue' | 'green' }) {
  const [isImprintOpen, setIsImprintOpen] = useState(false);

  const bg_class = theme === 'green' ? 'bg-[#004d33]' : 'bg-brand-blue';
  const hover_bg = theme === 'green' ? 'hover:text-[#004d33]' : 'hover:text-brand-blue';

  const handleServiceClick = (service?: string) => {
    if (window.location.pathname !== '/') {
      window.location.href = service ? `/#rechner?service=${service}` : '/#rechner';
      return;
    }

    const element = document.getElementById('rechner');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }

    if (service) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openRechner', { detail: { service } }));
      }, 400);
    }
  };

  return (
    <footer className={`${bg_class} text-white pt-16 pb-8 text-sm`}>
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 space-y-6">
          <Link href="/" className="inline-block">
            <img src="/logo_transparent.png" alt="Umzugsnetz Logo" className="h-12 w-auto object-contain brightness-0 invert" />
          </Link>
          <p className="text-white/80 leading-relaxed">
            Eines der größten Vergleichsportale für Umzugs- und Entrümpelungsangebote in Deutschland. Qualität, Vertrauen und Transparenz.
          </p>
          <div className="flex items-center gap-3 pt-2">
            {[
              { Icon: Instagram, link: 'https://instagram.com/umzugsnetz' },
              { Icon: Facebook, link: 'https://facebook.com/umzugsnetz' },
              { Icon: XIcon, link: 'https://x.com/umzugsnetz' },
              { Icon: TikTok, link: 'https://www.tiktok.com/@umzugsnetz' }
            ].map(({ Icon, link }, i) => (
              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white ${hover_bg} transition-all`}>
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="col-span-1">
          <h4 className="font-bold text-white uppercase tracking-wider mb-6">Leistungen</h4>
          <ul className="space-y-4 text-white/80">
            <li><button onClick={() => handleServiceClick('privatumzug')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Privatumzug</button></li>
            <li><button onClick={() => handleServiceClick('firmenumzug')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Firmenumzug</button></li>
            <li><button onClick={() => handleServiceClick('entruempelung')} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Entrümpelung</button></li>
            <li><button onClick={() => handleServiceClick()} className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none">Kostenrechner</button></li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="font-bold text-white uppercase tracking-wider mb-6">Informationen</h4>
          <ul className="space-y-4 text-white/80">
            <li><Link href="/#ratgeber" className="hover:text-white transition-colors">Ratgeber</Link></li>
            <li><Link href="/partner/umzug" className="hover:text-white transition-colors">Für Umzugsunternehmen</Link></li>
            <li><Link href="/partner/entruempelung" className="hover:text-white transition-colors">Für Entrümpelungsunternehmen</Link></li>
            <li><Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
            <li><Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link></li>
          </ul>
        </div>

        <div className="col-span-1">
          <h4 className="font-bold text-white uppercase tracking-wider mb-6">Kontakt</h4>
          <ul className="space-y-4 text-white/80">
            <li className="flex items-center gap-3"><Mail className="w-4 h-4 text-white/60" /> kontakt@umzugsnetz.de</li>
            <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-white/60" /> 01722699945</li>
          </ul>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5">
            <button
              type="button"
              onClick={() => setIsImprintOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Impressum anzeigen</span>
              <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isImprintOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {isImprintOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 border-t border-white/10 px-4 py-4 text-xs text-white/75">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/55" />
                      <span>Heinrich Pierson Straße 20</span>
                    </div>
                    <div>
                      <Link href="/impressum" className="font-bold text-white hover:text-white/80 transition-colors">
                        Vollständiges Impressum öffnen
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-8 text-white/60 text-[10px]">
            © {new Date().getFullYear()} Umzugsnetz
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8 border-t border-white/10 flex justify-center gap-6 text-white/80 text-xs font-medium">
        <Link href="/agb" className="hover:text-white transition-colors">AGB</Link>
        <Link href="/partnerbedingungen" className="hover:text-white transition-colors">Partnerbedingungen</Link>
        <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
        <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
      </div>
    </footer>
  );
}
