'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
  Phone,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { setSupabaseSessionPersistence, supabase } from '@/lib/supabase';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [showRegisterPasswordConfirm, setShowRegisterPasswordConfirm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [showAgbModal, setShowAgbModal] = useState(false);
  const [showDatenschutzModal, setShowDatenschutzModal] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [datenschutzAccepted, setDatenschutzAccepted] = useState(false);

  const isRegister = mode === 'register';
  const primaryActionLabel = isRegister ? 'Registrieren' : 'Anmelden';

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('warning', 'Fehlende Angaben', 'Bitte geben Sie E-Mail und Passwort ein.');
      return;
    }

    setIsSubmitting(true);
    try {
      setSupabaseSessionPersistence(rememberMe);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        throw error;
      }

      // Rolle aus User-Metadaten auslesen
      const userRole = data?.user?.user_metadata?.role || 'partner';
      
      // Cookies setzen damit die Middleware den Zugriff erlaubt
      const maxAge = rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 12; // 7 Tage oder 12 Stunden
      const accessToken = data.session?.access_token || '';
      document.cookie = `sb-access-token=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `user-role=${userRole}; path=/; max-age=${maxAge}; SameSite=Lax`;

      // Role-basiertes Redirect
      let redirectPath = '/partner'; // Standard für Partner
      if (userRole === 'admin') {
        redirectPath = '/geschaeftsfuehrer/dashboard';
      } else if (userRole === 'employee') {
        redirectPath = '/mitarbeiter';
      }

      showToast('success', 'Anmeldung erfolgreich', 'Sie werden weitergeleitet...');
      
      // Kurze Verzögerung für Toast-Anzeige
      setTimeout(() => {
        router.push(redirectPath);
      }, 500);
    } catch (error: any) {
      showToast('error', 'Anmeldung fehlgeschlagen', error?.message || 'Bitte prüfen Sie Ihre Eingaben.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!agbAccepted || !datenschutzAccepted) {
      showToast('warning', 'Bestätigung erforderlich', 'Bitte bestätigen Sie die AGB und Datenschutzerklärung.');
      return;
    }

    if (
      !registerEmail.trim()
      || !registerPassword.trim()
      || !registerPasswordConfirm.trim()
      || !contactName.trim()
      || !companyName.trim()
      || !phone.trim()
      || !location.trim()
      || !website.trim()
    ) {
      showToast('warning', 'Fehlende Angaben', 'Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      showToast('warning', 'Passwörter stimmen nicht überein', 'Bitte prüfen Sie die Passwortbestätigung.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/partners/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          contactName,
          email: registerEmail,
          phone,
          location,
          website,
          password: registerPassword,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Registrierung konnte nicht abgeschlossen werden.');
      }

      if (payload?.activated) {
        showToast(
          'success',
          'Partnerkonto freigeschaltet',
          'Ihre Registrierung war erfolgreich. Sie können sich jetzt direkt anmelden.',
        );
        setLoginEmail(registerEmail.trim());
        setLoginPassword('');
        setMode('login');
        setRegisterPassword('');
        setRegisterPasswordConfirm('');
      } else {
        showToast(
          'info',
          'Registrierung wird geprüft',
          'Wir prüfen Ihre Registrierung und melden uns bei Ihnen per E-Mail oder telefonisch zurück.',
        );
      }
    } catch (error: any) {
      showToast('error', 'Registrierung fehlgeschlagen', error?.message || 'Bitte prüfen Sie Ihre Angaben.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,_rgba(2,118,200,0.08),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(17,185,128,0.10),_transparent_22%),linear-gradient(180deg,_#ffffff_0%,_#f4faff_100%)] lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen w-full lg:h-screen lg:grid-cols-[calc(40%-1px)_2px_calc(60%-1px)]">
        <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:h-screen lg:overflow-y-auto lg:px-10">
          <div className="w-full max-w-xl">
            <div className="-mt-8 mb-2 flex justify-center">
              <motion.img
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
                src="/logo_transparent.png"
                alt="Umzugsnetz Logo"
                className="h-20 w-auto max-w-full object-contain sm:h-24 lg:h-28"
              />
            </div>

            <div className="mt-10 rounded-[32px] border border-brand-blue/10 bg-white p-7 shadow-[0_24px_70px_rgba(2,118,200,0.10)] sm:p-9">
              <div className="rounded-2xl border border-brand-blue/10 bg-slate-50 p-1">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`rounded-[14px] px-4 py-3 text-sm font-bold transition ${
                      mode === 'login'
                        ? 'bg-white text-brand-blue shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Anmelden
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className={`rounded-[14px] px-4 py-3 text-sm font-bold transition ${
                      mode === 'register'
                        ? 'bg-white text-brand-blue shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Registrieren
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <form className="mt-7 space-y-4">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        E-Mail
                      </label>
                      <input
                        type="email"
                        placeholder="name@unternehmen.de"
                        value={isRegister ? registerEmail : loginEmail}
                        onChange={(event) => isRegister ? setRegisterEmail(event.target.value) : setLoginEmail(event.target.value)}
                        className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Passwort
                      </label>
                      <div className="relative">
                        <input
                          type={isRegister ? (showRegisterPassword ? 'text' : 'password') : (showLoginPassword ? 'text' : 'password')}
                          placeholder="••••••••"
                          value={isRegister ? registerPassword : loginPassword}
                          onChange={(event) => isRegister ? setRegisterPassword(event.target.value) : setLoginPassword(event.target.value)}
                          className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                        />
                        <button
                          type="button"
                          onClick={() => isRegister ? setShowRegisterPassword((current) => !current) : setShowLoginPassword((current) => !current)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-brand-blue"
                          aria-label={isRegister
                            ? (showRegisterPassword ? 'Passwort verbergen' : 'Passwort anzeigen')
                            : (showLoginPassword ? 'Passwort verbergen' : 'Passwort anzeigen')}
                        >
                          {isRegister ? (
                            showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />
                          ) : (
                            showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isRegister && (
                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Passwort bestätigen
                        </label>
                        <div className="relative">
                          <input
                            type={showRegisterPasswordConfirm ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={registerPasswordConfirm}
                            onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                            className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPasswordConfirm((current) => !current)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-brand-blue"
                            aria-label={showRegisterPasswordConfirm ? 'Passwortbestätigung verbergen' : 'Passwortbestätigung anzeigen'}
                          >
                            {showRegisterPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {isRegister && (
                      <>
                        <div>
                          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Ansprechpartner
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Vorname Nachname"
                              value={contactName}
                              onChange={(event) => setContactName(event.target.value)}
                              className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 pl-12 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                            />
                            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Unternehmen
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Muster Umzuege GmbH"
                              value={companyName}
                              onChange={(event) => setCompanyName(event.target.value)}
                              className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 pl-12 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                            />
                            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Telefonnummer
                          </label>
                          <div className="relative">
                            <input
                              type="tel"
                              placeholder="+49 123 456789"
                              value={phone}
                              onChange={(event) => setPhone(event.target.value)}
                              className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 pl-12 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                            />
                            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Standort / Ort
                          </label>
                          <input
                            type="text"
                            placeholder="z. B. Berlin"
                            value={location}
                            onChange={(event) => setLocation(event.target.value)}
                            className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Website
                          </label>
                          <input
                            type="url"
                            placeholder="https://www.ihrefirma.de"
                            value={website}
                            onChange={(event) => setWebsite(event.target.value)}
                            className="w-full rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
                          />
                        </div>
                      </>
                    )}

                    {mode === 'register' && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleRegister}
                          disabled={isSubmitting || !agbAccepted || !datenschutzAccepted}
                          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white transition ${
                            agbAccepted && datenschutzAccepted
                              ? 'bg-brand-blue hover:bg-brand-blue-hover'
                              : 'bg-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isSubmitting ? 'Wird geprueft...' : primaryActionLabel}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setShowAgbModal(true)}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-4 text-sm font-black text-white transition hover:bg-brand-blue-hover"
                          >
                            AGB
                            {agbAccepted && <CheckCircle className="h-4 w-4 text-green-400" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDatenschutzModal(true)}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-4 text-sm font-black text-white transition hover:bg-brand-blue-hover"
                          >
                            Datenschutz
                            {datenschutzAccepted && <CheckCircle className="h-4 w-4 text-green-400" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>

                  {mode === 'login' && (
                    <div className="mt-5 space-y-4">
                      <button
                        type="button"
                        onClick={() => setRememberMe((current) => !current)}
                        className="flex w-full items-center justify-between rounded-2xl border border-brand-blue/12 bg-brand-blue-soft/50 px-4 py-3 text-left transition hover:border-brand-blue/20 hover:bg-brand-blue-soft"
                        aria-pressed={rememberMe}
                      >
                        <p className="text-sm font-semibold text-slate-800">Angemeldet bleiben</p>
                        <span
                          className={`relative ml-4 inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${
                            rememberMe ? 'bg-brand-blue' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                              rememberMe ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handleLogin}
                          disabled={isSubmitting}
                          className="flex items-center justify-center rounded-2xl bg-brand-blue px-5 py-3.5 text-sm font-black text-white transition hover:bg-brand-blue-hover"
                        >
                          {isSubmitting ? 'Prüfung...' : 'Anmelden'}
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl border border-brand-blue/15 bg-brand-blue-soft px-5 py-3.5 text-sm font-semibold text-brand-blue transition hover:border-brand-blue/25 hover:bg-white"
                        >
                          Passwort vergessen?
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <motion.div
            aria-hidden="true"
            className="h-full w-full bg-brand-blue"
            animate={{
              opacity: [0.72, 1, 0.72],
              boxShadow: [
                '0 0 24px rgba(2,118,200,0.18)',
                '0 0 42px rgba(2,118,200,0.26)',
                '0 0 24px rgba(2,118,200,0.18)',
              ],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative hidden min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(2,118,200,0.10),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(17,185,128,0.12),_transparent_26%),linear-gradient(180deg,_#f8fbff_0%,_#eef7ff_100%)] lg:block">
          <Image
            src="/loginbild.png"
            alt="Login Vorschau"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(244,250,255,0.12),rgba(244,250,255,0.04))]" />
        </div>
      </div>

      {/* AGB Modal */}
      <AnimatePresence>
        {showAgbModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowAgbModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">Allgemeine Geschäftsbedingungen</h2>
                <button
                  onClick={() => setShowAgbModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-6 text-slate-600 leading-relaxed">
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">§ 1 Geltungsbereich</h3>
                  <p>Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Website und der darüber bereitgestellten Vermittlungsleistungen von <strong>Umzugsnetz</strong>, betrieben von Dean Zander.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">§ 2 Leistungsbeschreibung</h3>
                  <p>Umzugsnetz stellt eine Vermittlungsplattform für Umzugs- und Entrümpelungsanfragen bereit. Über die Website können Nutzer Anfragen einstellen und passende Partnerunternehmen können kostenpflichtig Kundenanfragen freischalten.</p>
                  <p>Umzugsnetz wird ausschließlich als Vermittler tätig. Ein Vertrag über die eigentliche Umzugs- oder Entrümpelungsleistung kommt ausschließlich zwischen dem anfragenden Kunden und dem jeweiligen Partnerunternehmen zustande.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">§ 3 Kostenfreiheit für Endkunden</h3>
                  <p>Für Endkunden ist die Nutzung der Anfrage- und Vergleichsfunktionen grundsätzlich kostenlos und unverbindlich.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">§ 4 Pflichten der Nutzer</h3>
                  <p>Nutzer sind verpflichtet, sämtliche Angaben wahrheitsgemäß und vollständig zu machen und die Plattform nicht missbräuchlich zu verwenden. Insbesondere sind unzutreffende, irreführende oder missbräuchliche Anfragen unzulässig.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">§ 5 Haftung</h3>
                  <p>Umzugsnetz haftet nach den gesetzlichen Vorschriften bei Vorsatz und grober Fahrlässigkeit. Bei einfacher Fahrlässigkeit haftet Umzugsnetz nur bei Verletzung wesentlicher Vertragspflichten und beschränkt auf den vorhersehbaren, vertragstypischen Schaden.</p>
                  <p>Für die Leistungen, Preise, Zusagen und Inhalte der Partnerunternehmen übernimmt Umzugsnetz keine Gewähr, da diese Leistungen nicht von Umzugsnetz selbst erbracht werden.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">§ 6 Vertragsschluss mit Partnerunternehmen</h3>
                  <p>Ein möglicher Vertrag über die Durchführung eines Umzugs oder einer Entrümpelung kommt ausschließlich zwischen dem Kunden und dem ausgewählten Partnerunternehmen zustande. Umzugsnetz wird nicht Vertragspartei dieser Leistung.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">§ 7 Schlussbestimmungen</h3>
                  <p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts, soweit dem keine zwingenden Verbraucherschutzvorschriften entgegenstehen.</p>
                  <p>Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>
                </section>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={agbAccepted}
                    onChange={(e) => setAgbAccepted(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Ich akzeptiere die AGB</span>
                </label>
                <button
                  onClick={() => setShowAgbModal(false)}
                  className="rounded-2xl bg-brand-blue px-6 py-2 text-sm font-semibold text-white hover:bg-brand-blue-hover"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Datenschutz Modal */}
      <AnimatePresence>
        {showDatenschutzModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDatenschutzModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">Datenschutzerklärung</h2>
                <button
                  onClick={() => setShowDatenschutzModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-6 text-slate-600 leading-relaxed">
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">1. Verantwortlicher</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <p className="font-bold text-slate-800">Dean Zander</p>
                    <p>Heinrich Pierson Straße 20</p>
                    <p>E-Mail: kontakt@umzugsnetz.de</p>
                    <p>Telefon: 01722699945</p>
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">2. Allgemeine Hinweise zur Datenverarbeitung</h3>
                  <p>Personenbezogene Daten verarbeiten wir ausschließlich im Rahmen der gesetzlichen Vorgaben, insbesondere der Datenschutz-Grundverordnung (DSGVO), des Bundesdatenschutzgesetzes (BDSG) und – soweit einschlägig – des Telekommunikation-Digitale-Dienste-Datenschutz-Gesetzes (TDDDG).</p>
                  <p>Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">3. Hosting und technische Bereitstellung</h3>
                  <p>Diese Website wird technisch über Hosting- und Infrastrukturleistungen bereitgestellt. Dabei können beim Aufruf der Website technisch erforderliche Server-Logdaten verarbeitet werden, insbesondere IP-Adresse, Datum und Uhrzeit des Zugriffs, abgerufene Inhalte, Browsertyp, Betriebssystem sowie Referrer-URL.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">4. Kontaktaufnahme und Formulare</h3>
                  <p>Wenn Sie uns per Kontaktformular, Partnerformular, Kostenrechner, Livechat oder E-Mail kontaktieren, verarbeiten wir die von Ihnen eingegebenen Daten zur Bearbeitung Ihrer Anfrage und für Anschlussfragen.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">5. Vermittlung von Anfragen</h3>
                  <p>Wenn Sie den Kostenrechner oder eine Anfragefunktion nutzen, können Ihre Daten an passende Partnerunternehmen weitergegeben werden, soweit dies zur Vermittlung Ihrer Anfrage erforderlich ist.</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">6. Partnerbereich und Nutzerkonten</h3>
                  <p>Für den Partnerbereich werden Registrierungs-, Login- und Kontodaten verarbeitet. Dazu gehören insbesondere Stammdaten des Partnerunternehmens, Kontaktdaten, Login-Informationen, Guthaben- und Transaktionsdaten, Einstellungen sowie freigeschaltete Kundenanfragen.</p>
                </section>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={datenschutzAccepted}
                    onChange={(e) => setDatenschutzAccepted(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Ich akzeptiere die Datenschutzerklärung</span>
                </label>
                <button
                  onClick={() => setShowDatenschutzModal(false)}
                  className="rounded-2xl bg-brand-blue px-6 py-2 text-sm font-semibold text-white hover:bg-brand-blue-hover"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
