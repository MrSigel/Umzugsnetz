'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const INTERNAL_INVITE_CODE = 'umzugsnetz.de2026!admin';

export default function AdminLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const normalizeInternalEmail = (value: string) => {
    const trimmed = value.trim();
    return trimmed.includes('@') ? trimmed : `${trimmed}@admin.de`;
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    resetMessages();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizeInternalEmail(username),
        password,
      });

      if (loginError) throw loginError;

      const hasAccess = data.user?.app_metadata?.role === 'admin' || data.user?.user_metadata?.role === 'admin';

      if (!hasAccess && process.env.NODE_ENV === 'production') {
        await supabase.auth.signOut();
        throw new Error('Zugriff verweigert. Dieses Konto verfügt nicht über die erforderliche Berechtigung.');
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ungültige Anmeldedaten. Bitte versuchen Sie es erneut.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      if (inviteCode.trim() !== INTERNAL_INVITE_CODE) {
        throw new Error('Der Freischaltcode ist ungültig.');
      }

      if (registerPassword !== confirmPassword) {
        throw new Error('Die Passwörter stimmen nicht überein.');
      }

      if (registerPassword.length < 8) {
        throw new Error('Das Passwort muss mindestens 8 Zeichen lang sein.');
      }

      const email = normalizeInternalEmail(registerUsername);
      const displayName = registerUsername.trim() || 'Mitarbeiter';

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: registerPassword,
        options: {
          data: {
            role: 'admin',
            full_name: displayName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        router.push('/admin/dashboard');
        return;
      }

      setSuccess('Zugang angelegt. Bitte prüfen Sie Ihre E-Mails und bestätigen Sie das Konto.');
      setUsername(email);
      setPassword('');
      setRegisterUsername('');
      setRegisterPassword('');
      setConfirmPassword('');
      setInviteCode('');
      setActiveTab('login');
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(28,120,204,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,182,122,0.14),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-green to-brand-blue-3" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 shadow-[0_35px_90px_rgba(15,23,42,0.45)] backdrop-blur-xl"
        >
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-white/10 bg-transparent p-6 sm:p-8 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-10">
              <div className="max-w-md">
                <Link href="/" className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/90 transition-colors hover:bg-white/16">
                  <ShieldCheck className="h-4 w-4" />
                  Umzugsnetz
                </Link>

                <div className="mt-10 space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/80">
                    Interner Zugang
                  </div>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    Anmeldung für berechtigte Mitarbeiter.
                  </h1>
                  <p className="max-w-sm text-sm leading-relaxed text-white/72 sm:text-base">
                    Dieser Bereich ist ausschließlich für interne Nutzer vorgesehen. Bitte melden Sie sich mit Ihren Zugangsdaten an.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 text-slate-900 sm:p-8 lg:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center rounded-3xl border border-brand-blue/10 bg-brand-blue-soft p-4 shadow-sm">
                    <ShieldCheck className="h-8 w-8 text-brand-blue" />
                  </div>
                  <h2 className="mt-6 text-3xl font-black tracking-tight">Mitarbeiterzugang</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Melden Sie sich an oder richten Sie einen internen Zugang ein.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-7">
                  <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => switchTab('login')}
                      className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${activeTab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      Anmelden
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab('register')}
                      className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${activeTab === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      Registrieren
                    </button>
                  </div>

                  <div className="relative min-h-[432px] overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      {activeTab === 'login' ? (
                        <motion.form
                          key="login"
                          onSubmit={handleLogin}
                          initial={{ opacity: 0, x: -28 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 28 }}
                          transition={{ duration: 0.24, ease: 'easeOut' }}
                          className="space-y-6"
                        >
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Benutzername oder E-Mail</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                                placeholder="name@unternehmen.de"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Passwort</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                                placeholder="••••••••"
                                required
                              />
                            </div>
                            <div className="mt-3 text-right">
                              <Link href="/passwort-zuruecksetzen?bereich=admin" className="text-sm font-bold text-brand-blue hover:underline">
                                Passwort zurücksetzen
                              </Link>
                            </div>
                          </div>

                          {error && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600"
                            >
                              {error}
                            </motion.div>
                          )}

                          {success && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
                            >
                              {success}
                            </motion.div>
                          )}

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue py-4 font-bold text-white shadow-lg shadow-brand-blue/20 transition-all hover:bg-brand-blue-hover disabled:opacity-70"
                          >
                            {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Anmelden <ArrowRight className="h-5 w-5" /></>}
                          </button>
                        </motion.form>
                      ) : (
                        <motion.form
                          key="register"
                          onSubmit={handleRegister}
                          initial={{ opacity: 0, x: 28 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -28 }}
                          transition={{ duration: 0.24, ease: 'easeOut' }}
                          className="space-y-6"
                        >
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Benutzername oder E-Mail</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={registerUsername}
                                onChange={(e) => setRegisterUsername(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                                placeholder="name@unternehmen.de"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Passwort</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="password"
                                value={registerPassword}
                                onChange={(e) => setRegisterPassword(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                                placeholder="Mindestens 8 Zeichen"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Passwort bestätigen</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                                placeholder="Passwort wiederholen"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Freischaltcode</label>
                            <div className="relative">
                              <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                                placeholder="Interner Freischaltcode"
                                required
                              />
                            </div>
                          </div>

                          {error && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600"
                            >
                              {error}
                            </motion.div>
                          )}

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-4 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-brand-green-hover disabled:opacity-70"
                          >
                            {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Registrieren <ArrowRight className="h-5 w-5" /></>}
                          </button>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  <span>Umzugsnetz.de</span>
                  <Link href="/" className="text-brand-blue transition-colors hover:text-brand-blue-hover">Zur Startseite</Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
