'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Bereich = 'partner' | 'admin';

export default function PasswortZuruecksetzenClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bereich = (searchParams.get('bereich') === 'admin' ? 'admin' : 'partner') as Bereich;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const loginPath = bereich === 'admin' ? '/admin' : '/partners/login';
  const portalLabel = bereich === 'admin' ? 'internen Bereich' : 'Partner-Bereich';

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/passwort-zuruecksetzen?bereich=${bereich}`;
  }, [bereich]);

  useEffect(() => {
    const detectRecovery = async () => {
      const hasRecoveryHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
      const { data } = await supabase.auth.getSession();
      if (hasRecoveryHash || data.session) {
        setIsRecoveryMode(true);
      }
    };

    void detectRecovery();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setIsRecoveryMode(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) throw resetError;

      setSuccess(`Falls für ${email} ein Konto im ${portalLabel} hinterlegt ist, wurde soeben eine E-Mail zum Zurücksetzen versendet.`);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Die Anfrage konnte nicht versendet werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (password.length < 8) {
        throw new Error('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
      }

      if (password !== confirmPassword) {
        throw new Error('Die Passwörter stimmen nicht überein.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess('Ihr Passwort wurde erfolgreich aktualisiert. Sie können sich jetzt erneut anmelden.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => router.push(loginPath), 1200);
    } catch (err: any) {
      setError(err.message || 'Das Passwort konnte nicht aktualisiert werden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(28,120,204,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,182,122,0.16),transparent_28%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-[0_35px_90px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8"
        >
          <div className="rounded-[1.75rem] bg-white p-6 text-slate-900 shadow-xl shadow-slate-900/10 sm:p-8">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center rounded-3xl border border-brand-blue/10 bg-brand-blue-soft p-4 shadow-sm">
                <ShieldCheck className="h-8 w-8 text-brand-blue" />
              </div>
              <h1 className="mt-6 text-3xl font-black tracking-tight">Passwort zurücksetzen</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {isRecoveryMode
                  ? `Legen Sie jetzt ein neues Passwort für den ${portalLabel} fest.`
                  : `Fordern Sie eine sichere E-Mail zum Zurücksetzen für den ${portalLabel} an.`}
              </p>
            </div>

            {error && <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">{error}</div>}
            {success && <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{success}</div>}

            {isRecoveryMode ? (
              <form onSubmit={handleSetPassword} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Neues Passwort</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mindestens 8 Zeichen" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Passwort bestätigen</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Passwort wiederholen" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-blue py-4 font-black text-white shadow-xl shadow-brand-blue/20 transition-all hover:bg-brand-blue-hover disabled:opacity-60">
                  {loading ? 'Wird gespeichert...' : 'Neues Passwort speichern'} <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">E-Mail-Adresse</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@firma.de" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-blue py-4 font-black text-white shadow-xl shadow-brand-blue/20 transition-all hover:bg-brand-blue-hover disabled:opacity-60">
                  {loading ? 'Wird versendet...' : 'Reset-E-Mail anfordern'} <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link href={loginPath} className="text-sm font-bold text-brand-blue hover:underline">
                Zurück zum Login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
