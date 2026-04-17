'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, ArrowRight, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      
      // Check if this user is a partner
      const { data: partner, error: pError } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (pError || !partner) {
        await supabase.auth.signOut();
        throw new Error('Dieses Konto ist nicht als Partner registriert.');
      }

      // Status-Prüfung
      if (partner.status === 'SUSPENDED') {
        await supabase.auth.signOut();
        throw new Error('Ihr Account wurde gesperrt. Bitte kontaktieren Sie den Support.');
      }

      if (partner.status === 'PENDING') {
        await supabase.auth.signOut();
        throw new Error('Ihr Account wird noch geprüft. Sie erhalten eine Benachrichtigung, sobald er freigeschaltet ist.');
      }

      router.push('/partners/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(28,120,204,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,182,122,0.18),transparent_28%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 shadow-[0_35px_90px_rgba(15,23,42,0.45)] backdrop-blur-xl"
        >
          <div className="grid lg:grid-cols-[1fr_0.96fr]">
            <div className="relative min-h-[320px] overflow-hidden lg:min-h-[720px]">
              <img src="/2.jpeg" alt="Umzugsnetz Partner" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/88 via-brand-blue-hover/68 to-brand-green/48" />
              <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                <Link href="/" className="inline-flex w-max items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/90 transition-colors hover:bg-white/16">
                  <ShieldCheck className="h-4 w-4" />
                  Umzugsnetz Partner
                </Link>

                <div className="max-w-lg space-y-6 py-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/80">
                    Verifiziertes Netzwerk
                  </div>
                  <div>
                    <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                      Leads, Freigaben und Guthaben an einem Ort.
                    </h1>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-white/72 sm:text-lg">
                      Das Partner-Panel bleibt funktional, wirkt aber klarer und stärker an die Umzugsnetz-Marke angebunden.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { value: 'Live', label: 'Anfragen' },
                      { value: 'Sicher', label: 'Login' },
                      { value: 'Direkt', label: 'Dashboard' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-3xl border border-white/12 bg-white/10 px-4 py-4">
                        <div className="text-2xl font-black text-white">{item.value}</div>
                        <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/65">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/70">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em]">Sicherer Login für verifizierte Partner</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 text-slate-900 sm:p-8 lg:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center rounded-3xl border border-brand-blue/10 bg-brand-blue-soft p-4 shadow-sm">
                    <ShieldCheck className="h-8 w-8 text-brand-blue" />
                  </div>
                  <h2 className="mt-6 text-3xl font-black tracking-tight">Partner Login</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Melden Sie sich an, um Anfragen, Käufe und Einstellungen im Partnerbereich zu verwalten.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-7">
                  {error && (
                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">E-Mail Adresse</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                        <input
                          type="email"
                          required
                          placeholder="partner@firma.de"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Passwort</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-blue py-4 font-black text-white shadow-xl shadow-brand-blue/20 transition-all hover:bg-brand-blue-hover disabled:opacity-50"
                    >
                      {loading ? 'Anmeldung...' : 'Einloggen'} <ArrowRight className="h-5 w-5" />
                    </button>
                  </form>
                </div>

                <p className="mt-6 text-center text-sm font-medium text-slate-500">
                  Noch kein Konto? <Link href="/partners/register" className="font-bold text-brand-blue hover:underline">Registrieren</Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
